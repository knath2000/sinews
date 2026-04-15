import { db } from "@/server/db/client";

/**
 * Types used by the feed page.
 * This matches the join of daily_briefs + daily_brief_items + articles.
 */
interface FeedArticle {
  id: number;
  title: string;
  source_name: string;
  canonical_url: string;
  published_at: Date | null;
  summary: string | null;
  why_recommended: string | null;
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
          article: true,
        },
      },
    },
  });

  if (!brief) {
    return null;
  }

  // If brief exists but has no items, it might still be generating
  if (brief.status === "pending" && brief.daily_brief_items.length === 0) {
    return null;
  }

  const articles: FeedArticle[] = brief.daily_brief_items.map((item) => ({
    id: item.article?.id ?? 0,
    title: item.article?.title ?? "Untitled",
    source_name: item.article?.source_name ?? "Unknown",
    canonical_url: item.article?.canonical_url ?? "#",
    published_at: item.article?.published_at ?? null,
    summary: item.summary,
    why_recommended: item.why_recommended,
    rank: item.rank,
    score: item.score,
    brief_item_id: item.id,
  }));

  return { articles, generatedAt: brief.generated_at };
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
