import { db } from "@/server/db/client";
import { isFixtureArticle } from "@/server/fixture-utils";
import { logError } from "@/server/error-logger";
import {
  sanitizeFeedSnippet,
  sanitizeFeedText,
  sanitizeFeedTitle,
} from "@/server/text-utils";
import { parseBriefItemProvenance } from "@/lib/safari-insights";

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
  why_recommended: string | null;
  matched_signals: string[] | null;
  provenance: ReturnType<typeof parseBriefItemProvenance>;
  rank: number;
  score: number;
  brief_item_id: number;
}

/**
 * Loads today's 5-article brief for a given user.
 * Returns null if no brief exists today or is still generating.
 */
export async function loadTodaysBrief(userId: string): Promise<{
  articles: FeedArticle[];
  generatedAt: Date | null;
} | null> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

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
  });

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
export async function loadUserTopics(userId: string) {
  const prefs = await db.user_topic_preferences.findMany({
    where: { user_id: userId },
    select: { topic: true, weight: true, source: true },
  });
  return prefs;
}

/**
 * Submits feedback (thumbs up / down) for a brief item.
 */
export async function submitFeedback(
  userId: string,
  briefItemId: number,
  eventType: "thumbs_up" | "thumbs_down",
  articleId?: number,
  topic?: string,
  entity?: string
) {
  return db.feedback_events.create({
    data: {
      user_id: userId,
      daily_brief_item_id: briefItemId,
      event_type: eventType,
      article_id: articleId ?? null,
      topic: topic ?? null,
      entity: entity ?? null,
    },
  });
}
