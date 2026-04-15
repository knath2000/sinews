import { NextResponse } from "next/server";
import { loadTodaysBrief } from "@/server/feed-loader";

/**
 * GET /api/feed — returns today's 5-article brief.
 * In demo mode (no auth), returns 202 until a real user_id is available.
 */
export async function GET() {
  // TODO: wire up real user authentication
  // For now, use a demo user or return 202
  const demoUserId = process.env.DEMO_USER_ID || "";

  if (!demoUserId) {
    return NextResponse.json(
      { message: "No user configured. Set DEMO_USER_ID env var." },
      { status: 202 }
    );
  }

  const brief = await loadTodaysBrief(demoUserId);

  if (!brief) {
    return NextResponse.json(
      { message: "Brief is still generating" },
      { status: 202 }
    );
  }

  return NextResponse.json({
    articles: brief.articles,
    generatedAt: brief.generatedAt?.toISOString() ?? null,
  });
}
