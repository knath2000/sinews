import { inngest } from "./client";
import { classifyUnannotatedArticles } from "../article-classifier";
import { generateDailyBriefForUser } from "../brief-engine";
import { db } from "../db/client";
import { logError } from "../error-logger";

/**
 * batchAnnotateArticles Job - Runs after each ingestArticles cycle
 * Processes any unannotated articles in batch mode (fallback / catch-up)
 */
export const batchAnnotateArticles = inngest.createFunction(
  {
    id: "batch-annotate-articles",
    name: "Batch Annotate Unannotated Articles",
    retries: 1,
    triggers: [
      { event: "article.ingestion-complete" },
      { event: "admin.resync.annotations" }, // Manual admin trigger
    ],
  },
  async ({ step, event }) => {
    console.log(`[ANNOTATION] Triggered by ${event.name}`);

    // 1. Diagnostics: Log raw counts to the Inngest Output tab
    const stats = await step.run("check-database-stats", async () => {
      const totalArticles = await db.articles.count();
      const annotatedArticles = await db.article_annotations.count();

      // Check for 'ghost' rows (annotations with no data)
      const emptyAnnotations = await db.article_annotations.count({
        where: { topics_json: null },
      });

      return {
        db_total_articles: totalArticles,
        db_annotated_count: annotatedArticles,
        db_empty_ghost_annotations: emptyAnnotations,
        calculated_missing: totalArticles - annotatedArticles,
      };
    });

    // 2. Run the classification
    const count = await step.run("classify-batch", async () => {
      return await classifyUnannotatedArticles();
    });

    // 3. Recursive trigger: if we processed a full batch, loop again
    if (count >= 10) {
      await step.sendEvent("loop-resync", {
        name: "admin.resync.annotations",
        data: {},
      });
    }

    return {
      status: "success",
      processed_in_this_run: count,
      stats,
    };
  }
);

/**
 * generateDailyBrief Job - Triggered on first fetch for new local date
 * Scores candidates, picks top 5, generates summaries via OpenAI
 */
export const generateDailyBrief = inngest.createFunction(
  {
    id: "generate-daily-brief",
    name: "Generate Daily Brief for User",
    retries: 2,
    // Concurrency limit: one brief per user at a time
    concurrency: {
      key: "event.data.user_id",
      limit: 1,
    },
    triggers: [{ event: "daily-brief.triggered" }],
  },
  async ({ step, event }) => {
    const { user_id } = event.data;

    const result = await step.run("generate-brief", async () => {
      return await generateDailyBriefForUser(user_id);
    });

    return {
      status: "success",
      user_id,
      brief_id: result.brief_id,
      items_generated: result.items,
      duration_ms: result.duration_ms,
    };
  }
);

/**
 * generateAllDailyBriefs Job - Scheduled to trigger for all active users
 * Runs after the user's preferred brief_ready_hour_local
 */
export const generateAllDailyBriefs = inngest.createFunction(
  {
    id: "generate-all-daily-briefs",
    name: "Generate All Daily Briefs",
    retries: 1,
    triggers: [{ cron: "0 12 * * *" }], // Runs at noon UTC = 4am PST (default brief time)
  },
  async ({ step }) => {
    const users = await step.run("get-active-users", async () => {
      return await db.users.findMany({
        select: {
          id: true,
          timezone: true,
        },
        where: {
          user_profiles: {
            isNot: null,
          },
        },
      });
    });

    // Trigger brief generation for each user (staggered by their local time)
    const triggered = await step.run("trigger-briefs", async () => {
      let count = 0;
      for (const user of users) {
        try {
          // Send the event for this user
          // In a real setup, you'd check if the user's local hour matches
          await inngest.send({
            name: "daily-brief.triggered",
            data: { user_id: user.id },
          });
          count++;
        } catch (err) {
          logError("trigger-daily-brief", err, { userId: user.id });
        }
      }
      return { triggered_count: count, total_users: users.length };
    });

    return {
      status: "success",
      ...triggered,
    };
  }
);
