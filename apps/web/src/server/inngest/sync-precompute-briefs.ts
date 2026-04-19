import { inngest } from "./client";
import { db } from "../db/client";
import { isFeatureEnabled } from "../feature-flags";
import { generateDailyBriefForUser } from "../brief-engine";
import { logError } from "../error-logger";

/**
 * syncPrecomputeBriefs Job — triggered by cron every hour.
 * Gated by feature flag `enable_precompute`.
 *
 * For each active user (last_active_at > 7 days):
 *  1. Determine user's local time from users.timezone
 *  2. Check if current local time >= user.brief_ready_hour_local
 *  3. Check if daily_brief for today exists (status='completed')
 *  4. If no brief exists, call generateDailyBriefForUser(userId)
 *  5. Log results to job_runs table
 */
export const syncPrecomputeBriefs = inngest.createFunction(
  {
    id: "sync-precompute-briefs",
    name: "Precompute Daily Briefs",
    retries: 0,
    concurrency: {
      limit: 5,
    },
    triggers: [
      { cron: "0 * * * *" }, // Every hour
    ],
  },
  async ({ step, event }) => {
    return step.run("precompute-briefs", async () => {
      // Check feature flag
      const isEnabled = await isFeatureEnabled("enable_precompute");
      if (!isEnabled) {
        return { status: "skipped", reason: "feature-disabled" };
      }

      // Create a job_runs entry
      const jobRun = await db.job_runs.create({
        data: {
          job_name: "sync-precompute-briefs",
          status: "running",
        },
      });
      const jobRunId = jobRun.id;

      try {
        // Get all active users (last_active_at > 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const activeUsers = await db.user_profiles.findMany({
          where: {
            last_active_at: {
              gt: sevenDaysAgo,
            },
          },
          include: {
            user: {
              select: {
                timezone: true,
              },
            },
          },
        });

        const results: Array<{
          userId: string;
          status: string;
          briefId?: number;
          reason?: string;
        }> = [];

        const now = new Date();

        for (const profile of activeUsers) {
          const userId = profile.user_id;
          const timeZone = profile.user.timezone ?? "America/Los_Angeles";
          const readyHour = profile.brief_ready_hour_local ?? 4;

          try {
            // Determine local time
            const localHour = Number(
              now.toLocaleString("en-US", {
                timeZone,
                hour: "numeric",
                hour12: false,
              })
            );

            // Check if current local time >= brief_ready_hour_local
            if (localHour < readyHour) {
              results.push({
                userId,
                status: "skipped",
                reason: `local hour ${localHour} < ready hour ${readyHour}`,
              });
              continue;
            }

            // Determine today's date in user's timezone
            const localTodayStr = now.toLocaleDateString("en-CA", {
              timeZone,
            });
            const localToday = new Date(localTodayStr);

            // Check if daily_brief for today already exists (status='completed')
            const existingBrief = await db.daily_briefs.findFirst({
              where: {
                user_id: userId,
                brief_date: {
                  gte: localToday,
                  lt: new Date(localToday.getTime() + 24 * 60 * 60 * 1000),
                },
                status: "completed",
              },
            });

            if (existingBrief) {
              results.push({
                userId,
                status: "skipped",
                reason: "brief already exists for today",
                briefId: existingBrief.id,
              });
              continue;
            }

            // Generate the brief
            const briefResult = await generateDailyBriefForUser(userId);
            results.push({
              userId,
              status: "generated",
              briefId: briefResult.brief_id,
            });
          } catch (err) {
            const reason = err instanceof Error ? err.message : String(err);
            logError("sync-precompute-briefs-user", err, { userId });
            results.push({ userId, status: "error", reason });
          }
        }

        // Update job_runs status
        await db.job_runs.update({
          where: { id: jobRunId },
          data: {
            status: "completed",
            finished_at: new Date(),
          },
        });

        return {
          status: "completed",
          totalUsers: activeUsers.length,
          results,
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        // Mark job as failed
        logError("sync-precompute-briefs-job", err, { jobRunId });
        await db.job_runs.update({
          where: { id: jobRunId },
          data: {
            status: "failed",
            finished_at: new Date(),
            error_text: msg,
          },
        });
        throw err;
      }
    });
  }
);
