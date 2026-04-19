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
  article: LoadedBriefArticleRow | null;
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
        },
      },
    },
  }) as LoadedBriefRow | null;

  if (!brief) {
    return null;
  }

  // If brief exists but has no items, it might still be generating
  if (
    (brief.status === "pending" || brief.status === "generating") &&
    brief.daily_brief_items.length === 0
  ) {
    return null;
  }

  const itemIds = brief.daily_brief_items.map((i) => i.id);
  const feedbacks: FeedbackEventRow[] = await db.feedback_events.findMany({
    where: {
      user_id: userId,
      daily_brief_item_id: { in: itemIds },
    },
  }) as FeedbackEventRow[];
  const feedbackMap = new Map(feedbacks.map((f) => [f.daily_brief_item_id, f.event_type]));

  const articlesWithSource = brief.daily_brief_items
    .map((item) => {
      const article = item.article;
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
          matched_signals: article.article_annotations
            ? deriveMatchedSignals(
                article.article_annotations.topics_json,
                article.article_annotations.entities_json
              )
            : null,
          provenance: parseBriefItemProvenance(item.provenance_json),
          rank: item.rank,
          score: item.score,
          brief_item_id: item.id,
          user_feedback: (feedbackMap.get(item.id) as "thumbs_up" | "thumbs_down" | null) ?? null,
        },
      };
    })
    .filter(
      (entry): entry is { article: NonNullable<typeof brief.daily_brief_items[number]["article"]>; feedArticle: FeedArticle } =>
        entry !== null
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
      }
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
 * Derive matched signals array from article annotations JSON strings.
 * Returns null if annotations are missing.
 */
function deriveMatchedSignals(
  topicsJson: string | null,
  entitiesJson: string | null
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
        signals.push(...entities.slice(0, 3)); // cap at 3 entities
      }
    }
  } catch {
    return null;
  }
  return signals.length > 0 ? signals : null;
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
      include: {
        article: {
          include: { article_annotations: true },
        },
      },
    });

    let topics: string[] = [];
    let entities: string[] = [];

    if (briefItem?.article?.article_annotations) {
      const a = briefItem.article.article_annotations;
      try {
        if (a.topics_json) topics = JSON.parse(a.topics_json) as string[];
      } catch { /* ignore */ }
      try {
        if (a.entities_json) entities = JSON.parse(a.entities_json) as string[];
      } catch { /* ignore */ }
    }

    const actualArticleId = articleId ?? briefItem?.article?.id ?? null;

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
        article_id: actualArticleId,
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

// -- Immediate replacement for thumbs_down ---------------------------------

/**
 * Given a disliked article in today's brief, find a single replacement
 * article and patch that daily_brief_items row in place.
 *
 * Returns a FeedReplacementResult (same shape the feed page expects)
 * or null if no eligible replacement exists.
 */
export async function findReplacementArticle(
  userId: string,
  briefItemId: number,
  dislikedArticleId: number | undefined,
): Promise<FeedReplacementResult | null> {
  const { buildUserProfile, getCandidates, filterBySourcePolicy, scoreCandidates, getYesterdayBriefTopics } =
    await import("@/server/brief-engine");

  const now = new Date();

  // Resolve the target brief via the brief item's FK rather than a date query.
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
  if (!brief || brief.status !== "completed") return null;

  const targetItem = brief.daily_brief_items.find((i) => i.id === briefItemId);
  if (!targetItem) return null;

  const dislikedId = dislikedArticleId ?? targetItem.article_id;
  if (!dislikedId) return null;

  // Build sets to exclude
  const existingArticleIds = new Set<number>(
    brief.daily_brief_items
      .map((i) => i.article_id)
      .filter((id): id is number => id !== null)
  );

  // Get the disliked article's annotation for exclusion
  const dislikedArticle = await db.articles.findUnique({
    where: { id: dislikedId },
    include: { article_annotations: true },
  });
  if (!dislikedArticle) return null;
  const dislikedDedupeKey = dislikedArticle.article_annotations?.dedupe_key ?? null;
  const dislikedClusterId = dislikedArticle.cluster_id;

  // Gather dedupe/cluster keys from the 4 kept articles
  const keptItemIds = brief.daily_brief_items
    .filter((i) => i.id !== briefItemId && i.article_id !== null)
    .map((i) => i.article_id as number);
  const keptDedupeKeys = new Set<string>();
  const keptClusterIds = new Set<string>();
  if (keptItemIds.length > 0) {
    // Fetch annotations + cluster_ids for kept articles
    const keptAnnots = await db.article_annotations.findMany({
      where: { article: { id: { in: keptItemIds } } },
    });
    for (const ka of keptAnnots) {
      if (ka.dedupe_key) keptDedupeKeys.add(ka.dedupe_key);
    }
    const keptArts = await db.articles.findMany({
      where: { id: { in: keptItemIds } },
      select: { cluster_id: true },
    });
    for (const a of keptArts) {
      if (a.cluster_id) keptClusterIds.add(a.cluster_id);
    }
  }

  // Fetch candidate pool from the last 24 hours
  const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  let candidates = await getCandidates(since, 50);
  if (candidates.length === 0) return null;

  candidates = await filterBySourcePolicy(candidates);

  // Exclude: already in brief, the disliked article, same dedupe/cluster
  candidates = candidates.filter(
    (c) =>
      !existingArticleIds.has(c.article_id) &&
      c.article_id !== dislikedId &&
      (!dislikedDedupeKey || c.dedupe_key !== dislikedDedupeKey) &&
      (!dislikedClusterId || c.cluster_id !== dislikedClusterId) &&
      !keptDedupeKeys.has(c.dedupe_key) &&
      (!c.cluster_id || !keptClusterIds.has(c.cluster_id))
  );

  if (candidates.length === 0) return null;

  // Build user profile and score
  const profile = await buildUserProfile(userId);
  const yesterdayBriefTopics = await getYesterdayBriefTopics(userId);
  const scored = scoreCandidates(candidates, profile.topicWeights, profile.entityWeights, now, yesterdayBriefTopics);
  if (scored.length === 0) return null;

  // Take the top scorer
  const best = scored[0];
  const article = await db.articles.findUnique({
    where: { id: best.article_id },
    select: { snippet: true, image_url: true, canonical_url: true },
  });
  if (!article) return null;

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

  // Patch the brief item in place
  await db.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.daily_brief_items.update({
      where: { id: briefItemId },
      data: {
        article_id: best.article_id,
        score: best.score,
        summary,
        tldr,
        why_recommended: whyRecommended,
        provenance_json: JSON.stringify(provenance),
      },
    });

    // Bump the brief's generated_at so the feed header reflects the update
    await tx.daily_briefs.update({
      where: { id: brief.id },
      data: { generated_at: new Date() },
    });
  });

  // Build the result shape
  const signals = deriveMatchedSignals(
    JSON.stringify(best.topics),
    JSON.stringify(best.entities)
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
    rank: targetItem.rank,
    score: best.score,
    brief_item_id: briefItemId,
    user_feedback: null,
  };
}
