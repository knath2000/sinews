import { NextResponse, type NextRequest } from "next/server";
import { loadTodaysBrief } from "@/server/feed-loader";
import { requireAuth } from "@/lib/auth-server";
import { applyRateLimit } from "@/middleware/rate-limit";
import { generateDailyBriefForUser } from "@/server/brief-engine";
import { PHASE_MESSAGES, type BriefProgress } from "@/server/feed-loader";
import { logError } from "@/server/error-logger";

/**
 * GET /api/feed — returns today's 5-article brief.
 * If no brief exists, triggers generation and returns 202 with progress.
 * If brief is in-progress, returns 202 with real progress.
 * If brief is failed, returns 503 with failed progress.
 * If brief is completed, returns 200 with the existing payload.
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

  if (brief) {
    return NextResponse.json({
      articles: brief.articles,
      generatedAt: brief.generatedAt?.toISOString() ?? null,
    });
  }

  // No completed brief — check for in-progress / failed brief
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
      status: { in: ["pending", "generating", "failed"] },
    },
    select: { id: true, status: true, progress_json: true },
  });

  // -- FAILED brief — re-trigger generation --
  if (inProgressBrief?.status === "failed") {
    // Reset the failed brief so generation can run again.
    await db.daily_briefs.update({
      where: { id: inProgressBrief.id },
      data: {
        status: "pending",
        progress_json: JSON.stringify({
          phase: "starting",
          message: PHASE_MESSAGES.starting,
          step: 1,
          totalSteps: 6,
          itemsCompleted: 0,
          itemsTotal: 0,
          updatedAt: new Date().toISOString(),
        }),
      },
    });

    generateDailyBriefForUser(dbUser.id).catch((err) => {
      logError("brief-retry-after-failure", err, { userId: dbUser.id });
    });

    return NextResponse.json(
      {
        generating: true,
        status: "pending" as const,
        progress: {
          phase: "starting",
          message: PHASE_MESSAGES.starting,
          step: 1,
          totalSteps: 6,
          itemsCompleted: 0,
          itemsTotal: 0,
          updatedAt: new Date().toISOString(),
        },
        pollAfterMs: 3000,
      },
      { status: 202 }
    );
  }

  // -- IN-PROGRESS brief --
  const existingProgress = inProgressBrief?.progress_json
    ? (JSON.parse(inProgressBrief.progress_json) as BriefProgress)
    : null;

  if (!inProgressBrief) {
    // Trigger generation fire-and-forget
    generateDailyBriefForUser(dbUser.id).catch((err) => {
      logError("background-brief-generation", err, { userId: dbUser.id });
    });
  }

  const progress: BriefProgress = existingProgress ?? {
    phase: "starting",
    message: PHASE_MESSAGES.starting,
    step: 1,
    totalSteps: 6,
    itemsCompleted: 0,
    itemsTotal: 0,
    updatedAt: new Date().toISOString(),
  };

  return NextResponse.json(
    {
      generating: true,
      status: (inProgressBrief?.status ?? "pending") as "pending" | "generating",
      progress,
      pollAfterMs: 3000,
    },
    { status: 202 }
  );
}
