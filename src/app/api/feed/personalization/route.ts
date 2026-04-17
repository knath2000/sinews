import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";
import { db } from "@/server/db/client";

/**
 * GET /api/feed/personalization — returns personalization metrics for the sidebar.
 * Includes topic coverage, active signals, articles read today, and recent reading history.
 */
export async function GET() {
  const auth = await requireAuth();
  if ("status" in auth) return auth;
  const { dbUser } = auth;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Fetch active topics and their annotations in today's brief
  const userBrief = await db.daily_briefs.findFirst({
    where: {
      user_id: dbUser.id,
      brief_date: { gte: today, lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) },
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
      const annot = item.article?.article_annotations;
      if (annot?.topics_json) {
        try {
          const topics = JSON.parse(annot.topics_json) as string[];
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
    where: { user_id: dbUser.id, created_at: { gte: today } },
  });

  // Recent reading history (last 7 days, thumbs_up as engagement proxy)
  const recentReading = await db.$queryRaw<
    Array<{
      article_id: number;
      title: string;
      source_name: string;
      topics_json: string | null;
      created_at: string;
    }>
  >`
    SELECT 
      a.id as article_id,
      a.title,
      a.source_name,
      aa.topics_json,
      f.created_at::text as created_at
    FROM feedback_events f
    JOIN articles a ON f.article_id = a.id
    LEFT JOIN article_annotations aa ON aa.article_id = a.id
    WHERE f.user_id = ${dbUser.id}::uuid
      AND f.created_at > ${sevenDaysAgo}
      AND f.event_type IN ('thumbs_up', 'read')
    ORDER BY f.created_at DESC
    LIMIT 5
  `;

  const recentReadingParsed = recentReading.map((r) => {
    let topics: string[] = [];
    if (r.topics_json) {
      try {
        topics = JSON.parse(r.topics_json);
      } catch { /* skip */ }
    }
    return {
      articleId: r.article_id,
      title: r.title,
      source: r.source_name,
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
}
