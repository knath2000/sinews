/**
 * Database operations for brief progress tracking.
 * Splits `@/server/feed-loader.ts` to break the circular dependency with
 * `@/server/brief-engine.ts`.  Imports both this module (for db helpers)
 * and the shared progress types from `@/lib/brief-progress.ts`.
 */

import { db } from "@/server/db/client";
import type { BriefProgress } from "@/lib/brief-progress";

/**
 * Update progress_json on the brief identified by userId + briefDate.
 */
export async function updateBriefProgress(
  userId: string,
  briefDate: Date,
  progress: BriefProgress,
): Promise<void> {
  await db.daily_briefs.updateMany({
    where: {
      user_id: userId,
      brief_date: briefDate,
    },
    data: { progress_json: JSON.stringify(progress) },
  });
}

/**
 * Load progress for a user's brief today.
 * Returns null if no in-progress brief or no progress_json.
 */
export async function loadBriefProgress(
  userId: string,
): Promise<{ progress: BriefProgress; status: string } | null> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const brief = await db.daily_briefs.findFirst({
    where: {
      user_id: userId,
      brief_date: { gte: today },
      status: { in: ["pending", "generating", "failed"] },
    },
    select: { progress_json: true, status: true },
  });

  if (!brief?.progress_json) return null;

  try {
    const progress = JSON.parse(brief.progress_json) as BriefProgress;
    return { progress, status: brief.status };
  } catch {
    return null;
  }
}

/**
 * Clear progress_json on a brief (called when complete or on failure).
 */
export async function clearBriefProgress(
  userId: string,
  briefDate: Date,
): Promise<void> {
  await db.daily_briefs.updateMany({
    where: {
      user_id: userId,
      brief_date: briefDate,
    },
    data: { progress_json: null },
  });
}
