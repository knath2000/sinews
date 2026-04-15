import { NextResponse } from "next/server";
import { loadTodaysBrief } from "@/server/feed-loader";
import { requireAuth } from "@/lib/auth-server";

/**
 * GET /api/feed — returns today's 5-article brief.
 * Requires authentication.
 */
export async function GET() {
  const auth = await requireAuth();
  if ("status" in auth) return auth;
  const { dbUser } = auth;

  const brief = await loadTodaysBrief(dbUser.id);

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
