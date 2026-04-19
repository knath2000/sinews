import { PrismaClient } from "@prisma/client";
import { logError } from "../apps/web/src/server/error-logger";
import {
  sanitizeFeedSnippet,
  sanitizeFeedTitle,
} from "../apps/web/src/server/text-utils";

const db = new PrismaClient();

type ArticleRow = {
  id: number;
  title: string;
  snippet: string | null;
};

async function main() {
  console.log("[AI-NEWS] Backfilling article text...");

  const articles = await db.articles.findMany({
    select: {
      id: true,
      title: true,
      snippet: true,
    },
    orderBy: {
      id: "asc",
    },
  });

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const article of articles as ArticleRow[]) {
    try {
      const title = sanitizeFeedTitle(article.title) ?? (article.title.trim() || "Untitled");
      const snippet = sanitizeFeedSnippet(article.snippet);

      if (title === article.title && snippet === article.snippet) {
        skipped += 1;
        continue;
      }

      await db.articles.update({
        where: { id: article.id },
        data: {
          title,
          snippet,
        },
      });

      updated += 1;
      console.log(`[AI-NEWS] Cleaned article #${article.id}: ${title}`);
    } catch (error) {
      failed += 1;
      logError("article-text-backfill", error, {
        articleId: article.id,
        title: article.title,
      });
    }
  }

  console.log(
    `[AI-NEWS] Article text backfill complete: updated=${updated} skipped=${skipped} failed=${failed}`
  );

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    logError("article-text-backfill", error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
