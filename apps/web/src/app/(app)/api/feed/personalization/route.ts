import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";
import { db } from "@/server/db/client";
import { logError } from "@/server/error-logger";
import { getUserBriefDateRangeFromTz } from "@/lib/brief-date";

/**
 * GET /api/feed/personalization — returns personalization metrics for the sidebar.
 * Includes topic coverage, active signals, articles read today, and recent reading history.
 */
export async function GET() {
  try {
    const auth = await requireAuth();
    if ("status" in auth) return auth;
    const { dbUser } = auth;

    const now = new Date();
    const today = getUserBriefDateRangeFromTz(dbUser.timezone);
    const sevenDaysAgo = new Date(today.gte.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Fetch active topics and their annotations in today's brief
    const userBrief = await db.daily_briefs.findFirst({
      where: {
        user_id: dbUser.id,
        brief_date: today,
        status: "completed",
      },
      include: {
        daily_brief_items: {
          include: {
            article: {
              include: {
                article_annotations: true,
              },
            },
            archived_article: {
              select: {
                topics_json: true,
              },
            },
          },
        },
      },
      orderBy: { id: "desc" },
    });

    const totalTopics = await db.user_topic_preferences.count({
      where: { user_id: dbUser.id, weight: { gte: 0.1 } },
    });

    // Collect topics from today's brief items
    const coveredTopics = new Set<string>();
    if (userBrief) {
      for (const item of userBrief.daily_brief_items) {
        const topicsJson = item.article?.article_annotations?.topics_json ?? item.archived_article?.topics_json;
        if (topicsJson) {
          try {
            const topics = JSON.parse(topicsJson) as string[];
            topics.forEach((t) => coveredTopics.add(t));
          } catch { /* skip */ }
        }
      }
    }

    const activeSignals = await db.interest_signals.count({
      where: {
        user_id: dbUser.id,
        OR: [{ expires_at: null }, { expires_at: { gte: now } }],
      },
    });

    // Articles read/engaged today
    const readToday = await db.feedback_events.count({
      where: { user_id: dbUser.id, created_at: { gte: today.gte } },
    });

    // Recent reading history (last 7 days, thumbs_up as engagement proxy)
    const recentReading = await db.$queryRaw<
      Array<{
        article_id: number | null;
        title: string | null;
        source_name: string | null;
        topics_json: string | null;
        created_at: string;
      }>
    >`
      SELECT
        COALESCE(a.id, ar.id) as article_id,
        COALESCE(a.title, ar.title) as title,
        COALESCE(a.source_name, ar.source_name) as source_name,
        COALESCE(aa.topics_json, ar.topics_json) as topics_json,
        f.created_at::text as created_at
      FROM feedback_events f
      LEFT JOIN articles a ON f.article_id = a.id
      LEFT JOIN archived_articles ar ON f.archived_article_id = ar.id
      LEFT JOIN article_annotations aa ON aa.article_id = a.id
      WHERE f.user_id = ${dbUser.id}::uuid
        AND f.created_at > ${sevenDaysAgo}
        AND f.event_type IN ('thumbs_up', 'read')
      ORDER BY f.created_at DESC
      LIMIT 5
    `;

    const recentReadingParsed = recentReading.map((r: { article_id: number | null; title: string | null; source_name: string | null; topics_json: string | null; created_at: string }) => {
      let topics: string[] = [];
      if (r.topics_json) {
        try {
          topics = JSON.parse(r.topics_json);
        } catch { /* skip */ }
      }
      return {
        articleId: r.article_id,
        title: r.title ?? "Untitled",
        source: r.source_name ?? "Unknown",
        matchedTopics: topics,
        readAt: r.created_at,
      };
    });

    return NextResponse.json({
      personalization: {
        topicsCovered: coveredTopics.size,
        totalActiveTopics: totalTopics,
        activeSignals,
        articlesReadToday: readToday,
        recentReading: recentReadingParsed,
      },
    });
  } catch (err) {
    logError("api-feed-personalization", err);
    return NextResponse.json({ error: "Personalization data unavailable" }, { status: 500 });
  }
}
