import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { logError } from "../apps/web/src/server/error-logger";

const db = new PrismaClient();

async function main() {
  console.log("[AI-NEWS] Resetting derived content...");

  const before = {
    feedbackEvents: await db.feedback_events.count(),
    briefItems: await db.daily_brief_items.count(),
    briefs: await db.daily_briefs.count(),
    annotations: await db.article_annotations.count(),
    archivedArticles: await db.archived_articles.count(),
    articles: await db.articles.count(),
  };

  console.log(
    `[AI-NEWS] Before reset: feedback=${before.feedbackEvents}, briefItems=${before.briefItems}, briefs=${before.briefs}, annotations=${before.annotations}, archived=${before.archivedArticles}, articles=${before.articles}`
  );

  await db.$transaction(async (tx) => {
    await tx.feedback_events.deleteMany({});
    await tx.daily_brief_items.deleteMany({});
    await tx.daily_briefs.deleteMany({});
    await tx.article_annotations.deleteMany({});
    await tx.archived_articles.deleteMany({});
    await tx.articles.deleteMany({});
  });

  const after = {
    feedbackEvents: await db.feedback_events.count(),
    briefItems: await db.daily_brief_items.count(),
    briefs: await db.daily_briefs.count(),
    annotations: await db.article_annotations.count(),
    archivedArticles: await db.archived_articles.count(),
    articles: await db.articles.count(),
  };

  console.log(
    `[AI-NEWS] After reset: feedback=${after.feedbackEvents}, briefItems=${after.briefItems}, briefs=${after.briefs}, annotations=${after.annotations}, archived=${after.archivedArticles}, articles=${after.articles}`
  );
}

main()
  .catch((error) => {
    logError("reset-derived-content", error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
