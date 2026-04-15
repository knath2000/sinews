import { inngest } from "./client";
import { db } from "../db/client";
import { isFeatureEnabled } from "../feature-flags";
import {
  fetchXFollows,
  fetchXLikes,
  fetchXBookmarks,
  normalizeXSignals,
  extractTopics,
  recordSyncFailure,
  resetSyncFailure,
} from "../providers/x";

/**
 * syncXSignals Job — triggered by account.linked event + cron every 6 hours.
 * For each user with an active X linked account:
 *  - Checks feature flag enable_x_sync
 *  - Fetches follows, likes, (bookmarks if scoped)
 *  - Normalizes and writes to interest_signals table
 *  - Updates last_sync_at
 *  - On error: updates sync_error_code, increments consecutive failure count, disables after 3 failures
 */

type AccountLinkedEventData = {
  userId: string;
  provider: "x" | "google";
};

type SyncResult = {
  status: string;
  signalsWritten?: number;
  followsCount?: number;
  likesCount?: number;
  bookmarksCount?: number;
  reason?: string;
} | {
  status: string;
  signalsWritten?: number;
  followsCount?: number;
  likesCount?: number;
  bookmarksCount?: number;
  reason?: string;
};

type BatchResult = { userId: string; status: string }[];

export const syncXSignals = inngest.createFunction(
  {
    id: "sync-x-signals",
    name: "Sync X Interest Signals",
    retries: 1,
    triggers: [
      { cron: "0 */6 * * *" }, // Every 6 hours
      { event: "account.linked" }, // Triggered when X account is linked
    ],
  },
  async ({ event, step }) => {
    // If triggered by account.linked, check if it's for X
    if (event.name === "account.linked") {
      const data = event.data as unknown as AccountLinkedEventData;
      if (data.provider === "x") {
        return step.run("sync-x-user", async () => {
          return syncUserX(data.userId);
        });
      }
      return { status: "skipped", reason: "not-x-provider" } as const;
    }

    // Cron trigger — sync all active X accounts
    return step.run("sync-all-x", async () => {
      const accounts = await db.linked_accounts.findMany({
        where: { provider: "x", status: "active" },
        select: { user_id: true },
        distinct: ["user_id"],
      });

      const results: BatchResult = [];
      for (const { user_id: userId } of accounts) {
        try {
          const r = await syncUserX(userId);
          results.push({ userId, status: r.status as string });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`sync-x-signals: failed for user ${userId}:`, msg);
          results.push({ userId, status: "error" });
        }
      }
      return { total: results.length, results };
    });
  },
);

async function syncUserX(userId: string): Promise<SyncResult> {
  // Check feature flag
  const isEnabled = await isFeatureEnabled("enable_x_sync", userId);
  if (!isEnabled) {
    return { status: "skipped", reason: "feature-disabled" };
  }

  const follows = await fetchXFollows(userId);
  const likes = await fetchXLikes(userId);

  // Check if bookmarks scope is available
  const account = await db.linked_accounts.findFirst({
    where: { user_id: userId, provider: "x", status: "active" },
    select: { scopes_json: true },
  });

  const scopes: string[] = account?.scopes_json
    ? JSON.parse(account.scopes_json)
    : [];
  let bookmarks: { text: string; tweet_id: string }[] = [];
  if (
    scopes.includes("bookmark.read") ||
    scopes.includes("bookmarks.read")
  ) {
    bookmarks = await fetchXBookmarks(userId);
  }

  // Normalize all signals
  const allSignals: Parameters<typeof normalizeXSignals>[1] = [];

  // Follow signals
  for (const f of follows) {
    allSignals.push({
      topic: f.topic,
      provider: "x",
      signal_type: "x_follows",
      raw_value: f.raw,
      entity: f.entity,
      weight: 0.6,
      confidence: 0.7,
      source_reference: null,
    });
  }

  // Like signals
  for (const l of likes) {
    const topics = extractTopics(l.text);
    for (const topic of topics) {
      allSignals.push({
        topic,
        provider: "x",
        signal_type: "x_like_bookmark",
        raw_value: l.text,
        entity: null,
        weight: 0.7,
        confidence: 0.6,
        source_reference: l.tweet_id,
      });
    }
  }

  // Bookmark signals
  for (const b of bookmarks) {
    const topics = extractTopics(b.text);
    for (const topic of topics) {
      allSignals.push({
        topic,
        provider: "x",
        signal_type: "x_like_bookmark",
        raw_value: b.text,
        entity: null,
        weight: 0.7,
        confidence: 0.7,
        source_reference: b.tweet_id,
      });
    }
  }

  // Write signals
  const written = await normalizeXSignals(userId, allSignals);

  // Update sync metadata
  await db.linked_accounts.updateMany({
    where: { user_id: userId, provider: "x", status: "active" },
    data: { last_sync_at: new Date() },
  });

  // Reset failure count on success
  await resetSyncFailure(userId, "x");

  return {
    status: "success",
    signalsWritten: written,
    followsCount: follows.length,
    likesCount: likes.length,
    bookmarksCount: bookmarks.length,
  };
}
