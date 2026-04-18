import { inngest } from "./client";
import { generateDailyBriefForUser } from "../brief-engine";
import { db } from "../db/client";
import { logError } from "../error-logger";

/**
 * generateAllUserBriefs Job - Manual/admin trigger to generate briefs for ALL active users
 * This ensures every active user who hasn't received a brief today gets one
 */
export const generateAllUserBriefs = inngest.createFunction(
  {
    id: "generate-all-user-briefs",
    name: "Generate Briefs For All Active Users",
    retries: 1,
    concurrency: {
      limit: 2,
    },
    triggers: [
      { event: "admin.generate-all-briefs" },
    ],
  },
  async ({ step }) => {
    // 1. Find all active users who haven't received a brief today
    const users = await step.run("find-users-needing-briefs", async () => {
      const activeUsers = await db.users.findMany({
        select: {
          id: true,
          email: true,
        },
        where: {
          user_profiles: {
            isNot: null,
          },
        },
      });

      const usersNeedingBriefs: Array<{ id: string; email: string; status?: string | null }> = [];

      for (const user of activeUsers) {
        // Check if user already has a completed brief today
        const existingBrief = await db.daily_briefs.findFirst({
          where: {
            user_id: user.id,
            status: "completed",
            generated_at: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
            },
          },
          select: { status: true },
        });

        // Skip users who already have a completed brief today
        if (existingBrief && existingBrief.status === "completed") {
          continue;
        }

        usersNeedingBriefs.push({
          id: user.id,
          email: user.email,
          status: existingBrief?.status ?? null,
        });
      }

      return usersNeedingBriefs;
    });

    if (users.length === 0) {
      return { status: "success", message: "All users already have briefs today" };
    }

    // 2. Log target user count
    const logInfo = await step.run("log-target-users", async () => {
      console.log(`[BRIEFS] Targeting ${users.length} users who need briefs generated today`);
      return { target_count: users.length };
    });

    // 3. Trigger individual brief generation events for each user
    const results = await step.run("enqueue-brief-events", async () => {
      const events = users.map((user) => ({
        name: "daily-brief.triggered" as const,
        data: { user_id: user.id },
      }));

      await inngest.send(events);

      return {
        enqueued_count: events.length,
        user_ids: users.map((u) => u.id),
      };
    });

    return {
      status: "success",
      users_needing_briefs: users.length,
      enqueued_count: results.enqueued_count,
      failed_count: users.filter((u) => u.status === "failed").length,
      pending_count: users.filter((u) => u.status === "pending").length,
    };
  }
);
