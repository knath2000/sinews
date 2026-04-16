import { NextResponse, type NextRequest } from "next/server";
import { loadTodaysBrief } from "@/server/feed-loader";
import { requireAuth } from "@/lib/auth-server";
import { applyRateLimit } from "@/middleware/rate-limit";
import { generateDailyBriefForUser } from "@/server/brief-engine";

/**
 * GET /api/feed — returns today's 5-article brief.
 * If no brief exists, triggers generation on first call and returns 202.
 * Requires authentication.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if ("status" in auth) return auth;
  const { dbUser } = auth;

  // Rate-limit brief generation trigger
  const rl = await applyRateLimit(request, "feed-generate", {
    limit: 5,
    windowMs: 60_000,
    identifyBy: "user",
  });
  if (rl) return rl;

  const brief = await loadTodaysBrief(dbUser.id);

  if (!brief) {
    // Check if a generation is already in progress (pending/generating brief)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { db } = await import("@/server/db/client");
    const inProgressBrief = await db.daily_briefs.findFirst({
      where: {
        user_id: dbUser.id,
        brief_date: {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        },
        status: { in: ["pending", "generating"] },
      },
    });

    if (!inProgressBrief) {
      // Trigger generation fire-and-forget
      generateDailyBriefForUser(dbUser.id).catch((err) => {
        console.error("Background brief generation failed:", err);
      });
    }

    return NextResponse.json(
      { message: "Brief is being generated", generating: true },
      { status: 202 }
    );
  }

  return NextResponse.json({
    articles: brief.articles,
    generatedAt: brief.generatedAt?.toISOString() ?? null,
  });
}
