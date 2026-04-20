import { db } from "@/server/db/client";
import { Prisma } from "@prisma/client";
import { isFixtureArticle } from "@/server/fixture-utils";
import { logError } from "@/server/error-logger";
import {
  sanitizeFeedSnippet,
  sanitizeFeedText,
  sanitizeFeedTitle,
} from "@/server/text-utils";
import { parseBriefItemProvenance, buildBriefItemProvenance } from "@/lib/safari-insights";
import { generateBriefItem } from "@/server/brief-engine";
import { getTodayBriefDateForUser } from "@/lib/brief-date";
import { getArticleSnapshotById, getCurrentArticleCutoff } from "./article-archive";

/**
 * Types used by the feed page.
 * This matches the join of daily_briefs + daily_brief_items + articles.
 */
interface FeedArticle {
  id: number;
  title: string;
  source_name: string;
  canonical_url: string;
  image_url: string | null;
  published_at: Date | null;
  summary: string | null;
  tldr: string | null;
  why_recommended: string | null;
  matched_signals: string[] | null;
  provenance: ReturnType<typeof parseBriefItemProvenance>;
  rank: number;
  score: number;
  brief_item_id: number;
  user_feedback: "thumbs_up" | "thumbs_down" | null;
  replacement_notice: { reason: string; message: string } | null;
}

type FeedbackEventRow = {
  daily_brief_item_id: number;
  event_type: string;
};

type UserTopicPreferenceRow = {
  topic: string;
  weight: number;
  source: string;
};

type LoadedBriefArticleRow = {
  id: number;
  title: string;
  source_name: string;
  canonical_url: string;
  image_url: string | null;
  published_at: Date | null;
  provider: string;
  license_class: string | null;
  is_fixture: boolean;
  article_annotations: {
    topics_json: string | null;
    entities_json: string | null;
  } | null;
};

type LoadedBriefItemRow = {
  id: number;
  rank: number;
  score: number;
  summary: string | null;
  tldr: string | null;
  why_recommended: string | null;
  provenance_json: string | null;
  replacement_outcome: string | null;
  article_id: number | null;
  archived_article_id: number | null;
  article: LoadedBriefArticleRow | null;
  archived_article: {
    id: number;
    title: string;
    source_name: string;
    canonical_url: string;
    image_url: string | null;
    published_at: Date | null;
    provider: string;
    license_class: string | null;
    is_fixture: boolean;
    topics_json: string | null;
    entities_json: string | null;
  } | null;
};

type LoadedBriefRow = {
  id: number;
  status: string;
  generated_at: Date | null;
  daily_brief_items: LoadedBriefItemRow[];
};

type ReplacementBriefItemRow = {
  id: number;
  article_id: number | null;
  archived_article_id: number | null;
  rank: number;
};

type ReplacementBriefRow = {
  id: number;
  status: string;
  daily_brief_items: ReplacementBriefItemRow[];
};

type ReplacementBriefLookupRow = {
  daily_brief: ReplacementBriefRow | null;
};

/** Shape returned to the API for a single replacement article. */
export interface FeedReplacementResult {
  id: number;
  title: string;
  source_name: string;
  canonical_url: string;
  image_url: string | null;
  published_at: string | null;
  summary: string | null;
  tldr: string | null;
  why_recommended: string | null;
  matched_signals: string[] | null;
  provenance: ReturnType<typeof parseBriefItemProvenance>;
  rank: number;
  score: number;
  brief_item_id: number;
  user_feedback: "thumbs_up" | "thumbs_down" | null;
}

// -- Replacement outcomes ---------------------------------------------------

export type ReplacementOutcomeReason =
  | "no_current_day_candidates"
  | "all_candidates_filtered"
  | "already_shown_or_duplicate_cluster"
  | "race_lost_retry_exhausted";

export interface ReplacementFailure {
  outcome: {
    ok: false;
    reason: ReplacementOutcomeReason;
    message: string;
  };
  article: null;
}

function replacementFailure(
  reason: ReplacementOutcomeReason,
  message: string,
): ReplacementFailure {
  return { outcome: { ok: false as const, reason, message }, article: null };
}

interface ReplacementAttemptContext {
  userId: string;
  briefItemId: number;
  dislikedId: number;
  dislikedDedupeKey: string | null;
  dislikedClusterId: string | null;
  keptDedupeKeys: Set<string>;
  keptClusterIds: Set<string>;
  existingArticleIds: Set<number>;
  briefId: number;
  targetItem: ReplacementBriefItemRow;
}

const REPLACEMENT_RETRY_ATTEMPTS = 2;

async function attemptReplacement(
  ctx: ReplacementAttemptContext,
): Promise<ReplacementFailure | FeedReplacementResult> {
  const { buildUserProfile, getCandidates, filterBySourcePolicy, scoreCandidates, getYesterdayBriefTopics } =
    await import("@/server/brief-engine");

  const now = new Date();

  const since = getCurrentArticleCutoff(now);
  let candidates = await getCandidates(since, 50);
  if (candidates.length === 0) {
    return replacementFailure(
      "no_current_day_candidates",
      "No current-date articles were available to replace this article.",
    );
  }

  candidates = await filterBySourcePolicy(candidates);

  // Exclude: already in brief, the disliked article, same dedupe/cluster
  candidates = candidates.filter(
    (c) =>
      !ctx.existingArticleIds.has(c.article_id) &&
      c.article_id !== ctx.dislikedId &&
      (!ctx.dislikedDedupeKey || c.dedupe_key !== ctx.dislikedDedupeKey) &&
      (!ctx.dislikedClusterId || c.cluster_id !== ctx.dislikedClusterId) &&
      !ctx.keptDedupeKeys.has(c.dedupe_key) &&
      (!c.cluster_id || !ctx.keptClusterIds.has(c.cluster_id)),
  );

  if (candidates.length === 0) {
    return replacementFailure(
      "all_candidates_filtered",
      "No current-date articles matched your preferences after excluding articles already shown and duplicate clusters.",
    );
  }

  // Build user profile and score
  const profile = await buildUserProfile(ctx.userId);
  const yesterdayBriefTopics = await getYesterdayBriefTopics(ctx.userId);
  const scored = scoreCandidates(candidates, profile.topicWeights, profile.entityWeights, now, yesterdayBriefTopics);
  if (scored.length === 0) {
    return replacementFailure(
      "already_shown_or_duplicate_cluster",
      "All matching articles were already shown in today's brief.",
    );
  }

  // Take the top scorer
  const best = scored[0];
  const article = await getArticleSnapshotById(best.article_id);
  if (!article) {
    return replacementFailure(
      "no_current_day_candidates",
      "Could not load the replacement article.",
    );
  }

  // Generate summary + why_recommended
  let summary: string;
  let tldr: string;
  let whyRecommended: string;
  try {
    const matchedTopics = best.topics.filter((t) => profile.topicWeights.has(t));
    const matchedEntities = best.entities.filter((e) => profile.entityWeights.has(e));
    const generated = await generateBriefItem({
      article_title: best.title,
      article_source: best.source_name,
      article_snippet: sanitizeFeedSnippet(article.snippet ?? null),
      matched_topics: matchedTopics,
      matched_entities: matchedEntities,
    });
    summary = generated.summary;
    tldr = generated.tldr;
    whyRecommended = generated.why_recommended;
  } catch {
    summary = best.title;
    tldr = "";
    whyRecommended = "Relevant to your interests";
  }

  // Build provenance
  const provenance = buildBriefItemProvenance({
    matchedTopics: best.topics.filter((t) => profile.topicWeights.has(t)),
    matchedEntities: best.entities.filter((e) => profile.entityWeights.has(e)),
    safariTopicWeights: profile.safariHistoryImport.topicWeights,
    safariTopicDomainWeights: profile.safariHistoryImport.topicDomainWeights,
  });

  // Patch the brief item in place with collision retry
  for (let attempt = 1; attempt <= REPLACEMENT_RETRY_ATTEMPTS; attempt++) {
    try {
      await db.$transaction(async (tx: Prisma.TransactionClient) => {
        await tx.daily_brief_items.update({
          where: { id: ctx.briefItemId },
          data: {
            article_id: best.article_id,
            score: best.score,
            summary,
            tldr,
            why_recommended: whyRecommended,
            provenance_json: JSON.stringify(provenance),
            replacement_outcome: null,
          },
        });

        await tx.daily_briefs.update({
          where: { id: ctx.briefId },
          data: { generated_at: new Date() },
        });
      });

      const signals = deriveMatchedSignals(
        JSON.stringify(best.topics),
        JSON.stringify(best.entities),
      );

      return {
        id: best.article_id,
        title: sanitizeFeedTitle(best.title) ?? best.title,
        source_name: best.source_name,
        canonical_url: article.canonical_url ?? "#",
        image_url: article.image_url?.trim() || null,
        published_at: best.published_at?.toISOString() ?? null,
        summary,
        tldr,
        why_recommended: whyRecommended,
        matched_signals: signals,
        provenance,
        rank: ctx.targetItem.rank,
        score: best.score,
        brief_item_id: ctx.briefItemId,
        user_feedback: null,
      };
    } catch (err: unknown) {
      const code =
        typeof err === "object" && err !== null && "code" in err
          ? (err as { code?: string }).code
          : undefined;
      const isUniqueConstraintViolation =
        code === "P2002" || code === "P2003";

      if (isUniqueConstraintViolation && attempt < REPLACEMENT_RETRY_ATTEMPTS) {
        logError(
          "replacement-collision-retry",
          new Error("Duplicate article collision during replacement, retrying"),
          {
            briefItemId: ctx.briefItemId,
            attemptedArticleId: best.article_id,
            attempt,
          },
        );
        continue;
      }

      if (isUniqueConstraintViolation && attempt >= REPLACEMENT_RETRY_ATTEMPTS) {
        return replacementFailure(
          "race_lost_retry_exhausted",
          "A replacement was found but could not be applied due to a race condition. Please try again.",
        );
      }

      throw err;
    }
  }

  return replacementFailure(
    "already_shown_or_duplicate_cluster",
    "All matching articles were already shown in today's brief.",
  );
}

/**
 * Given a disliked article in today's brief, find a single replacement
 * article and patch that daily_brief_items row in place.
 *
 * Returns:
 *   - { outcome: null, article: FeedReplacementResult } on success
 *   - { outcome: {ok:false, reason, message}, article: null } on failure
 */
export async function findReplacementArticle(
  userId: string,
  briefItemId: number,
  dislikedArticleId: number | undefined,
): Promise<{ outcome: null; article: FeedReplacementResult } | ReplacementFailure> {
  const briefItem = await db.daily_brief_items.findUnique({
    where: { id: briefItemId },
    include: {
      daily_brief: {
        include: {
          daily_brief_items: {
            orderBy: { rank: "asc" },
          },
        },
      },
    },
  }) as ReplacementBriefLookupRow | null;
  const brief = briefItem?.daily_brief;
  if (!brief || brief.status !== "completed") {
    return replacementFailure(
      "no_current_day_candidates",
      "No current-date articles were available to replace this article.",
    );
  }

  const targetItem = brief.daily_brief_items.find((i) => i.id === briefItemId);
  if (!targetItem) {
    return replacementFailure(
      "no_current_day_candidates",
      "No current-date articles were available to replace this article.",
    );
  }

  const dislikedId = dislikedArticleId ?? targetItem.article_id ?? targetItem.archived_article_id;
  if (!dislikedId) {
    return replacementFailure(
      "no_current_day_candidates",
      "No current-date articles were available to replace this article.",
    );
  }

  const existingArticleIds = new Set<number>(
    brief.daily_brief_items
      .map((i) => i.article_id ?? i.archived_article_id)
      .filter((id): id is number => id !== null && id !== dislikedId),
  );

  const dislikedArticle = await getArticleSnapshotById(dislikedId);
  if (!dislikedArticle) {
    return replacementFailure(
      "no_current_day_candidates",
      "No current-date articles were available to replace this article.",
    );
  }
  const dislikedDedupeKey = dislikedArticle.dedupe_key ?? null;
  const dislikedClusterId = dislikedArticle.cluster_id;

  const keptItemIds = brief.daily_brief_items
    .filter((i) => i.id !== briefItemId && (i.article_id !== null || i.archived_article_id !== null))
    .map((i) => (i.article_id ?? i.archived_article_id) as number);
  const keptDedupeKeys = new Set<string>();
  const keptClusterIds = new Set<string>();
  if (keptItemIds.length > 0) {
    const keptArticles = await Promise.all(keptItemIds.map((id) => getArticleSnapshotById(id)));
    for (const article of keptArticles) {
      if (!article) continue;
      if (article.dedupe_key) keptDedupeKeys.add(article.dedupe_key);
      if (article.cluster_id) keptClusterIds.add(article.cluster_id);
    }
  }

  const ctx: ReplacementAttemptContext = {
    userId,
    briefItemId,
    dislikedId,
    dislikedDedupeKey,
    dislikedClusterId,
    keptDedupeKeys,
    keptClusterIds,
    existingArticleIds,
    briefId: brief.id,
    targetItem,
  };

  const result = await attemptReplacement(ctx);

  if ("outcome" in result) {
    // ReplacementFailure
    await db.daily_brief_items.update({
      where: { id: briefItemId },
      data: { replacement_outcome: JSON.stringify(result.outcome) },
    });
    return result;
  }

  return { outcome: null, article: result as FeedReplacementResult };
}

/**
 * Loads today's 5-article brief for a given user.
 * Returns null if no brief exists today or is still generating.
 */
export async function loadTodaysBrief(userId: string): Promise<{
  articles: FeedArticle[];
  generatedAt: Date | null;
} | null> {
  const today = await getTodayBriefDateForUser(userId);

  const brief = await db.daily_briefs.findFirst({
    where: {
      user_id: userId,
      brief_date: {
        gte: today,
        lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
      },
    },
    include: {
      daily_brief_items: {
        orderBy: { rank: "asc" },
        include: {
          article: {
            include: {
              article_annotations: true,
            },
          },
          archived_article: {
            select: {
              id: true,
              title: true,
              source_name: true,
              canonical_url: true,
              image_url: true,
              published_at: true,
              provider: true,
              license_class: true,
              is_fixture: true,
              topics_json: true,
              entities_json: true,
            },
          },
        },
      },
    },
  }) as LoadedBriefRow | null;

  if (!brief) {
    return null;
  }

  if (
    (brief.status === "pending" || brief.status === "generating") &&
    brief.daily_brief_items.length === 0
  ) {
    return null;
  }

  // ── Duplicate suppression: if any two items share article_id or
  //    archived_article_id, keep only the first by rank and log anomaly.
  const seenIds = new Set<number>();
  const dedupedItems: LoadedBriefItemRow[] = [];
  for (const item of brief.daily_brief_items) {
    const articleId = item.article_id ?? item.archived_article_id;
    if (articleId !== null && seenIds.has(articleId)) {
      logError(
        "brief-duplicate-suppression",
        new Error("Duplicate article found in brief, suppressing later occurrence"),
        { briefId: brief.id, userId, duplicateArticleId: articleId, itemId: item.id },
      );
      continue;
    }
    if (articleId !== null) seenIds.add(articleId);
    dedupedItems.push(item);
  }

  const itemIds = dedupedItems.map((i) => i.id);
  const feedbacks: FeedbackEventRow[] = await db.feedback_events.findMany({
    where: {
      user_id: userId,
      daily_brief_item_id: { in: itemIds },
    },
  }) as FeedbackEventRow[];
  const feedbackMap = new Map(feedbacks.map((f) => [f.daily_brief_item_id, f.event_type]));

  const articlesWithSource = dedupedItems
    .map((item) => {
      const article = item.article ?? item.archived_article;
      if (!article) return null;

      return {
        article,
        feedArticle: {
          id: article.id,
          title: sanitizeFeedTitle(article.title) ?? "Untitled",
          source_name: article.source_name ?? "Unknown",
          canonical_url: article.canonical_url ?? "#",
          image_url: article.image_url?.trim() || null,
          published_at: article.published_at ?? null,
          summary: sanitizeFeedSnippet(item.summary),
          tldr: sanitizeFeedText(item.tldr, {
            stripHtml: true,
            maxLength: 100,
          }),
          why_recommended: sanitizeFeedText(item.why_recommended, {
            stripHtml: true,
            maxLength: 200,
          }),
          matched_signals: "article_annotations" in article && article.article_annotations
            ? deriveMatchedSignals(
                article.article_annotations.topics_json,
                article.article_annotations.entities_json,
              )
            : deriveMatchedSignals(
                item.archived_article?.topics_json ?? null,
                item.archived_article?.entities_json ?? null,
              ),
          provenance: parseBriefItemProvenance(item.provenance_json),
          rank: item.rank,
          score: item.score,
          brief_item_id: item.id,
          user_feedback: (feedbackMap.get(item.id) as "thumbs_up" | "thumbs_down" | null) ?? null,
          replacement_notice: parseBriefItemReplacementNotice(item.replacement_outcome),
        },
      };
    })
    .filter(
      (entry): entry is { article: NonNullable<typeof brief.daily_brief_items[number]["article"] | typeof brief.daily_brief_items[number]["archived_article"]>; feedArticle: FeedArticle } =>
        entry !== null,
    );

  const articles = articlesWithSource
    .filter(({ article }) => {
      return !isFixtureArticle({
        canonical_url: article.canonical_url,
        provider: article.provider,
        license_class: article.license_class,
        is_fixture: article.is_fixture,
      });
    })
    .map(({ feedArticle }) => feedArticle);

  const skippedCount = articlesWithSource.length - articles.length;
  if (skippedCount > 0) {
    logError(
      "feed-load-filtered-fixtures",
      new Error("Filtered fixture articles from today's brief"),
      {
        briefId: brief.id,
        userId,
        skippedCount,
        totalItems: brief.daily_brief_items.length,
      },
    );
  }

  if (articles.length === 0) {
    logError("feed-load-empty-after-filtering", new Error("No eligible articles remained after filtering brief items"), {
      briefId: brief.id,
      userId,
      totalItems: brief.daily_brief_items.length,
    });
    return null;
  }

  return { articles, generatedAt: brief.generated_at };
}

/**
 * Parse a replacement_notice JSON string from a brief item into a structured object.
 */
function parseBriefItemReplacementNotice(value: string | null): { reason: string; message: string } | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    if (
      typeof parsed.reason === "string" &&
      typeof parsed.message === "string"
    ) {
      return { reason: parsed.reason, message: parsed.message };
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

/**
 * Loads all topic preferences for a user.
 */
export async function loadUserTopics(userId: string): Promise<UserTopicPreferenceRow[]> {
  const prefs: UserTopicPreferenceRow[] = await db.user_topic_preferences.findMany({
    where: { user_id: userId },
    select: { topic: true, weight: true, source: true },
  }) as UserTopicPreferenceRow[];
  return prefs;
}

// -- Brief progress tracking -----------------------------------------------

export {
  BRIEF_PHASES,
  PHASE_MESSAGES,
  PHASE_ORDER,
  type BriefProgress,
} from "@/lib/brief-progress";

export {
  updateBriefProgress,
  loadBriefProgress,
  clearBriefProgress,
} from "@/lib/brief-progress-db";
// -- Feedback + interest_signals -------------------------------------------

/**
 * Persists a single feedback event and writes derived interest_signals
 * from the article's annotation snapshot. Before writing, deletes any
 * existing feedback_events for the same user + brief item, and cleans up
 * any prior feedback-derived interest signals.
 */
export async function submitFeedbackAndSignals(
  userId: string,
  briefItemId: number,
  eventType: "thumbs_up" | "thumbs_down",
  articleId?: number,
): Promise<void> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const signalWeight = 1.0;
  const signalConfidence = 0.7;

  await db.$transaction(async (tx: Prisma.TransactionClient) => {
    // 1. Delete any prior feedback_events for this user + brief item
    await tx.feedback_events.deleteMany({
      where: {
        user_id: userId,
        daily_brief_item_id: briefItemId,
        event_type: { in: ["thumbs_up", "thumbs_down"] },
      },
    });

    // 2. Lookup the article's annotation via the brief item
    const briefItem = await tx.daily_brief_items.findUnique({
      where: { id: briefItemId },
      select: {
        id: true,
        article_id: true,
        archived_article_id: true,
      },
    });

    let topics: string[] = [];
    let entities: string[] = [];

    const snapshot = await getArticleSnapshotById(
      articleId ?? briefItem?.article_id ?? briefItem?.archived_article_id ?? 0,
    );
    if (snapshot?.topics_json) {
      try {
        topics = JSON.parse(snapshot.topics_json) as string[];
      } catch { /* ignore */ }
    }
    if (snapshot?.entities_json) {
      try {
        entities = JSON.parse(snapshot.entities_json) as string[];
      } catch { /* ignore */ }
    }

    const feedbackArticleData = snapshot
      ? snapshot.isArchived
        ? { archived_article_id: snapshot.id, article_id: null }
        : { article_id: snapshot.id, archived_article_id: null }
      : { article_id: null, archived_article_id: null };

    // 3. Delete ALL prior interest_signals derived from this brief item
    // (covers stale signals from a previously-replaced article in this slot)
    await tx.interest_signals.deleteMany({
      where: {
        user_id: userId,
        signal_type: { in: ["thumbs_up", "thumbs_down"] },
        source_reference: { startsWith: `feedback:${briefItemId}:` },
      },
    });

    // 4. Create the feedback event
    await tx.feedback_events.create({
      data: {
        user_id: userId,
        daily_brief_item_id: briefItemId,
        event_type: eventType,
        ...feedbackArticleData,
      },
    });

    // 5. Write interest_signals per topic
    for (const topic of topics) {
      await tx.interest_signals.create({
        data: {
          user_id: userId,
          signal_type: eventType,
          normalized_topic: topic,
          weight: signalWeight,
          confidence: signalConfidence,
          expires_at: expiresAt,
          source_reference: `feedback:${briefItemId}:topic:${topic}`,
        },
      });
    }

    // 6. Write interest_signals for top 3 entities
    for (const entity of entities.slice(0, 3)) {
      await tx.interest_signals.create({
        data: {
          user_id: userId,
          signal_type: eventType,
          entity,
          weight: signalWeight,
          confidence: signalConfidence,
          expires_at: expiresAt,
          source_reference: `feedback:${briefItemId}:entity:${entity}`,
        },
      });
    }
  });
}

/**
 * Derive matched signals array from article annotations JSON strings.
 * Returns null if annotations are missing.
 */
function deriveMatchedSignals(
  topicsJson: string | null,
  entitiesJson: string | null,
): string[] | null {
  const signals: string[] = [];
  try {
    if (topicsJson) {
      const topics = JSON.parse(topicsJson) as string[] | { topic?: string }[];
      if (Array.isArray(topics)) {
        topics.forEach((t) => {
          if (typeof t === "string") signals.push(t);
          else if (typeof t === "object" && t.topic) signals.push(t.topic);
        });
      }
    }
    if (entitiesJson) {
      const entities = JSON.parse(entitiesJson) as string[];
      if (Array.isArray(entities)) {
        signals.push(...entities.slice(0, 3));
      }
    }
  } catch {
    return null;
  }
  return signals.length > 0 ? signals : null;
}
