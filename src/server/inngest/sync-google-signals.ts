import { inngest } from "./client";
import { db } from "../db/client";
import { isFeatureEnabled } from "../feature-flags";
import {
  fetchGoogleProfile,
  normalizeGoogleSignals,
  recordSyncFailure,
} from "../providers/google";
import { logError } from "../error-logger";

/**
 * syncGoogleSignals Job — triggered by account.linked event + cron every 12 hours.
 * For each user with an active Google linked account:
 *  - Checks feature flag enable_google_sync
 *  - Fetches Google profile via People API
 *  - Normalizes organization/language/email signals to interest_signals table
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
  orgCount?: number;
  langCount?: number;
  reason?: string;
};

type BatchResult = { userId: string; status: string }[];

export const syncGoogleSignals = inngest.createFunction(
  {
    id: "sync-google-signals",
    name: "Sync Google Interest Signals",
    retries: 1,
    triggers: [
      { cron: "0 */12 * * *" }, // Every 12 hours
      { event: "account.linked" }, // Triggered when Google account is linked
    ],
  },
  async ({ event, step }) => {
    // If triggered by account.linked, check if it's for Google
    if (event.name === "account.linked") {
      const data = event.data as unknown as AccountLinkedEventData;
      if (data.provider === "google") {
        return step.run("sync-google-user", async () => {
          return syncUserGoogle(data.userId);
        });
      }
      return { status: "skipped", reason: "not-google-provider" } as const;
    }

    // Cron trigger — sync all active Google accounts
    return step.run("sync-all-google", async () => {
      const accounts = await db.linked_accounts.findMany({
        where: { provider: "google", status: "active" },
        select: { user_id: true },
        distinct: ["user_id"],
      });

      const results: BatchResult = [];
      for (const { user_id: userId } of accounts) {
        try {
          const r = await syncUserGoogle(userId);
          results.push({ userId, status: r.status as string });
        } catch (err) {
          logError("sync-google-signals-user", err, { userId });
          results.push({ userId, status: "error" });
        }
      }
      return { total: results.length, results };
    });
  },
);

async function syncUserGoogle(userId: string): Promise<SyncResult> {
  // Check feature flag
  const isEnabled = await isFeatureEnabled("enable_google_sync", userId);
  if (!isEnabled) {
    return { status: "skipped", reason: "feature-disabled" };
  }

  const profile = await fetchGoogleProfile(userId);
  const written = await normalizeGoogleSignals(userId, profile);

  // Update sync metadata
  await db.linked_accounts.updateMany({
    where: { user_id: userId, provider: "google", status: "active" },
    data: { last_sync_at: new Date() },
  });

  // Reset failure count on success
  await db.linked_accounts.updateMany({
    where: { user_id: userId, provider: "google" },
    data: { sync_failure_count: 0, sync_error_code: null },
  });

  const orgCount = profile.organizations?.length ?? 0;
  const langCount = profile.languages?.length ?? 0;

  return {
    status: "success",
    signalsWritten: written,
    orgCount,
    langCount,
  };
}
