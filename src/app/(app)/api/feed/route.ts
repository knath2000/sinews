import { NextResponse, type NextRequest } from "next/server";
import { loadTodaysBrief } from "@/server/feed-loader";
import { requireAuth } from "@/lib/auth-server";
import { applyRateLimit } from "@/middleware/rate-limit";
import { PHASE_MESSAGES, type BriefProgress } from "@/lib/brief-progress";

export const dynamic = "force-dynamic";
import { logError } from "@/server/error-logger";
import { inngest } from "@/server/inngest/client";

/**
 * GET /api/feed — returns today's 5-article brief.
 * If no brief exists, triggers generation and returns 202 with progress.
 * If brief is in-progress, returns 202 with real progress.
 * If brief is failed, returns 503 with failed progress.
 * If brief is completed, returns 200 with the existing payload.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if ("status" in auth) return auth;
    const { dbUser } = auth;

    const brief = await loadTodaysBrief(dbUser.id);

    if (brief) {
      return NextResponse.json({
        articles: brief.articles,
        generatedAt: brief.generatedAt?.toISOString() ?? null,
      });
    }

    // No completed brief — check for in-progress / failed brief
    const { db } = await import("@/server/db/client");

    // Use exact date string matching aligned with brief-engine.ts
    const localDateStr = new Date().toLocaleDateString("en-CA", { timeZone: dbUser.timezone || "America/Los_Angeles" });
    const briefDate = new Date(localDateStr);

    const inProgressBrief = await db.daily_briefs.findFirst({
      where: {
        user_id: dbUser.id,
        brief_date: briefDate,
        status: { in: ["pending", "generating", "failed"] },
      },
      select: { id: true, status: true, progress_json: true },
    });

    // -- FAILED brief — re-trigger generation --
    if (inProgressBrief?.status === "failed") {
      const rl = await applyRateLimit(request, "feed-generate", {
        limit: 5,
        windowMs: 60_000,
        identifyBy: "user",
      });
      if (rl) return rl;

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

      try {
        await inngest.send({
          name: "daily-brief.triggered",
          data: { user_id: dbUser.id },
        });
      } catch (err) {
        logError("brief-retry-inngest-failed", err, { userId: dbUser.id });
        return NextResponse.json({ error: "Failed to queue generation" }, { status: 500 });
      }

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
      // Rate-limit the generation trigger
      const rl = await applyRateLimit(request, "feed-generate", {
        limit: 5,
        windowMs: 60_000,
        identifyBy: "user",
      });
      if (rl) return rl;

      // Upsert a pending row so subsequent polls see a real record
      await db.daily_briefs.upsert({
        where: {
          user_id_brief_date: {
            user_id: dbUser.id,
            brief_date: briefDate,
          },
        },
        create: {
          user_id: dbUser.id,
          brief_date: briefDate,
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
        update: {},
      });

      // Trigger durable generation via Inngest
      try {
        await inngest.send({
          name: "daily-brief.triggered",
          data: { user_id: dbUser.id },
        });
      } catch (err) {
        logError("brief-generation-inngest-failed", err, { userId: dbUser.id });
        return NextResponse.json({ error: "Failed to queue generation" }, { status: 500 });
      }
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
  } catch (err) {
    logError("api-feed", err);
    return NextResponse.json({ error: "Feed unavailable" }, { status: 500 });
  }
}
