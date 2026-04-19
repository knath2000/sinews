import { archiveOldArticles } from "../apps/web/src/server/article-archive";
import { db } from "../apps/web/src/server/db/client";
import { logError } from "../apps/web/src/server/error-logger";

async function main() {
  console.log("[AI-NEWS] Archiving stale articles...");
  const result = await archiveOldArticles();
  console.log(
    `[AI-NEWS] Archived ${result.archived_articles} articles, moved ${result.moved_brief_items} brief items, and moved ${result.moved_feedback_events} feedback events.`
  );
}

main()
  .catch((error) => {
    logError("archive-old-articles", error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
