import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-admin";
import { db } from "@/server/db/client";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/metrics
 * Admin-only route that returns aggregated ingestion and connector metrics.
 */
export async function GET() {
  const auth = await requireAdmin();
  if ("status" in auth) return auth;

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  try {
    // Run sequentially to prevent connection pool exhaustion on cold starts
    const articlesBySource = await db.articles.groupBy({
      by: ["source_name", "provider"],
      where: { published_at: { gte: sevenDaysAgo } },
      _count: true,
    });

    const articlesBySourceToday = await db.articles.groupBy({
      by: ["source_name", "provider"],
      where: { published_at: { gte: startOfDay } },
      _count: true,
    });

    const briefsOverview = await db.daily_briefs.groupBy({
      by: ["status"],
      _count: true,
      _avg: { generation_duration_ms: true },
    });

    const connectorFailures = await db.linked_accounts.groupBy({
      by: ["provider"],
      where: { sync_error_code: { not: null } },
      _count: true,
      _sum: { sync_failure_count: true },
    });

    const topTopics = await db.feedback_events.groupBy({
      by: ["topic"],
      where: {
        topic: { not: null },
        created_at: { gte: sevenDaysAgo },
      },
      _count: true,
    });

    const blockedSources = await db.source_policies.findMany({
      where: { enabled: false },
      select: { source_name: true, enabled: true, quality_floor: true },
    });

    // Also count failed briefs today
    const failedToday = await db.daily_briefs.count({
      where: {
        status: "failed",
        generated_at: { gte: startOfDay },
      },
    });

    // Compute brief totals
    const totalBriefs = briefsOverview.reduce(
      (sum: number, b: { _count: number }) => sum + b._count,
      0,
    );
    const successfulBriefs = briefsOverview.find((b: { status: string, _count: number }) => b.status === "completed" || b.status === "success")?._count ?? 0;
    const successRate = totalBriefs > 0 ? (successfulBriefs / totalBriefs) * 100 : 0;
    const avgDuration =
      briefsOverview.find((b: { status: string, _count: number, _avg: { generation_duration_ms: number | null } }) => b.status === "completed" || b.status === "success")?._avg?.generation_duration_ms;

    return NextResponse.json({
      ingestionStats: articlesBySource.map(
        (row: { source_name: string; provider: string; _count: number }) => ({
          source: row.source_name,
          provider: row.provider,
          count: row._count,
        }),
      ),
      ingestionStatsToday: articlesBySourceToday.map(
        (row: { source_name: string; provider: string; _count: number }) => ({
          source: row.source_name,
          provider: row.provider,
          count: row._count,
        }),
      ),
      briefStats: {
        success_rate: Math.round(successRate * 100) / 100,
        avg_duration_ms: avgDuration ? Math.round(avgDuration) : 0,
        total_generated: totalBriefs,
        today_failed: failedToday,
      },
      connectorFailures: connectorFailures.map(
        (row: {
          provider: string;
          _count: number;
          _sum: { sync_failure_count: number | null };
        }) => ({
          provider: row.provider,
          error_count: row._count,
          users_affected: row._count,
        }),
      ),
      topTopics: topTopics
        .filter((t: { topic: string | null }) => t.topic !== null)
        .slice(0, 10)
        .map((t: { topic: string | null; _count: number }) => ({
          topic: t.topic! as string,
          count: t._count,
        })),
      blockedSources,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Metrics API Error:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
