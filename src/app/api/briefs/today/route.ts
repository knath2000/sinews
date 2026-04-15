import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureUser } from "@/lib/auth";
import { db } from "@/server/db/client";

/**
 * GET /api/briefs/today
 * Returns today's brief or queues generation.
 */
export async function GET() {
  const supabase = await createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await ensureUser(session.user.id, session.user.email ?? "");

  if (!user.profile?.onboarding_complete) {
    return NextResponse.json(
      { error: "Complete onboarding first", needsOnboarding: true },
      { status: 403 }
    );
  }

  try {
    // Get today's date at the start of day in UTC
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    // Check if a brief exists for today
    const existingBrief = await db.daily_briefs.findFirst({
      where: {
        user_id: user.id,
        brief_date: today,
      },
      include: {
        daily_brief_items: {
          include: {
            article: true,
          },
          orderBy: { rank: "asc" },
        },
      },
    });

    if (existingBrief) {
      return NextResponse.json({
        brief: {
          id: existingBrief.id,
          status: existingBrief.status,
          generatedAt: existingBrief.generated_at,
          items: existingBrief.daily_brief_items.map((item) => ({
            rank: item.rank,
            score: item.score,
            summary: item.summary,
            whyRecommended: item.why_recommended,
            article: item.article
              ? {
                  id: item.article.id,
                  title: item.article.title,
                  sourceName: item.article.source_name,
                  canonicalUrl: item.article.canonical_url,
                  snippet: item.article.snippet,
                  publishedAt: item.article.published_at,
                  imageUrl: item.article.image_url,
                }
              : null,
          })),
        },
      });
    }

    // Brief doesn't exist yet — return status indicating it's not ready
    // In a real app, you'd trigger a queue job here via Inngest
    return NextResponse.json({
      brief: null,
      status: "pending",
      message: "Brief is being prepared",
    });
  } catch (error) {
    console.error("Error fetching brief:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
