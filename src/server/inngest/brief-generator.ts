import { inngest } from "./client";
import { classifyUnannotatedArticles } from "../article-classifier";
import { generateDailyBriefForUser } from "../brief-engine";
import { db } from "../db/client";

/**
 * batchAnnotateArticles Job - Runs after each ingestArticles cycle
 * Processes any unannotated articles in batch mode (fallback / catch-up)
 */
export const batchAnnotateArticles = inngest.createFunction(
  {
    id: "batch-annotate-articles",
    name: "Batch Annotate Unannotated Articles",
    retries: 1,
    triggers: [{ event: "article.ingestion-complete" }],
  },
  async ({ step }) => {
    const count = await step.run("classify-batch", async () => {
      return await classifyUnannotatedArticles();
    });

    return { status: "success", annotated_count: count };
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
          console.error(
            `Failed to trigger brief for user ${user.id}:`,
            err
          );
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

/**
 * scheduleIngressAnnotations Job - After ingestArticles, trigger annotation
 */
export const scheduleIngressAnnotations = inngest.createFunction(
  {
    id: "schedule-ingress-annotations",
    name: "Schedule Annotations After Ingestion",
    retries: 0,
    triggers: [{ event: "article.ingestion-complete" }],
  },
  async ({ step }) => {
    // This function emits individual events for any articles that don't
    // have annotations yet, which will trigger the annotateArticles job
    const unannotated = await step.run("find-unannotated", async () => {
      const articles = await db.articles.findMany({
        where: {
          article_annotations: null,
          blocked_reason: null,
        },
        select: { id: true },
        take: 100,
      });
      return articles;
    });

    if (unannotated.length > 0) {
      await step.run("emit-events", async () => {
        const events = unannotated.map((a) => ({
          name: "article.inserted" as const,
          data: { article_id: a.id },
        }));
        await inngest.send(events);
        return { emitted: events.length };
      });
    }

    return {
      status: "success",
      found: unannotated.length,
    };
  }
);
