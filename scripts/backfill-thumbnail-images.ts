import { PrismaClient } from "@prisma/client";
import { fetchArticlePageImageUrl } from "../src/server/news-fetcher";
import { logError } from "../src/server/error-logger";
import { normalizePublicImageUrl } from "../src/server/url-utils";

const db = new PrismaClient();
const LOOKBACK_DAYS = Number(process.env.BACKFILL_LOOKBACK_DAYS ?? "30");
const RECENT_BRIEF_COUNT = Number(process.env.BACKFILL_BRIEF_COUNT ?? "10");
const MAX_ARTICLES = Number(process.env.BACKFILL_LIMIT ?? "120");
const FETCH_CONCURRENCY = Number(process.env.BACKFILL_CONCURRENCY ?? "5");

type CandidateArticle = {
  id: number;
  title: string;
  source_name: string;
  canonical_url: string;
  image_url: string | null;
};

function mergeCandidates(...groups: CandidateArticle[][]): CandidateArticle[] {
  const seen = new Set<number>();
  const merged: CandidateArticle[] = [];

  for (const group of groups) {
    for (const article of group) {
      if (seen.has(article.id)) continue;
      seen.add(article.id);
      merged.push(article);
    }
  }

  return merged;
}

async function loadRecentBriefArticleIds(): Promise<number[]> {
  const briefs = await db.daily_briefs.findMany({
    orderBy: { generated_at: "desc" },
    take: RECENT_BRIEF_COUNT,
    select: {
      daily_brief_items: {
        select: {
          article_id: true,
        },
      },
    },
  });

  const ids = new Set<number>();
  for (const brief of briefs) {
    for (const item of brief.daily_brief_items) {
      if (typeof item.article_id === "number") {
        ids.add(item.article_id);
      }
    }
  }

  return Array.from(ids);
}

async function loadRecentCandidates(): Promise<CandidateArticle[]> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - LOOKBACK_DAYS);

  const recentArticles = await db.articles.findMany({
    where: {
      blocked_reason: null,
      OR: [{ image_url: null }, { image_url: "" }],
      published_at: { gte: cutoff },
    },
    select: {
      id: true,
      title: true,
      source_name: true,
      canonical_url: true,
      image_url: true,
    },
    orderBy: [{ published_at: "desc" }, { id: "desc" }],
    take: MAX_ARTICLES,
  });

  const briefIds = await loadRecentBriefArticleIds();
  const briefCandidates = briefIds.length
    ? await db.articles.findMany({
        where: {
          blocked_reason: null,
          OR: [{ image_url: null }, { image_url: "" }],
          id: { in: briefIds },
        },
        select: {
          id: true,
          title: true,
          source_name: true,
          canonical_url: true,
          image_url: true,
        },
      })
    : [];

  return mergeCandidates(recentArticles, briefCandidates).slice(0, MAX_ARTICLES);
}

async function main() {
  console.log("[AI-NEWS] Backfilling article thumbnails...");

  const candidates = await loadRecentCandidates();
  console.log(
    `[AI-NEWS] Candidates: ${candidates.length} | lookback=${LOOKBACK_DAYS}d | briefCount=${RECENT_BRIEF_COUNT}`
  );

  const cache = new Map<string, Promise<string | null>>();
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  async function getImage(articleUrl: string): Promise<string | null> {
    const existing = cache.get(articleUrl);
    if (existing) return existing;

    const promise = fetchArticlePageImageUrl(articleUrl);
    cache.set(articleUrl, promise);
    return promise;
  }

  async function worker(queue: CandidateArticle[]): Promise<void> {
    for (const article of queue) {
      try {
        const imageUrl =
          normalizePublicImageUrl(article.image_url ?? "", article.canonical_url) ??
          (await getImage(article.canonical_url));

        if (!imageUrl) {
          skipped++;
          continue;
        }

        await db.articles.update({
          where: { id: article.id },
          data: { image_url: imageUrl },
        });
        updated++;
        console.log(
          `[AI-NEWS] Updated thumbnail for #${article.id} ${article.source_name}: ${article.title}`
        );
      } catch (error) {
        failed++;
        logError("thumbnail-backfill", error, {
          articleId: article.id,
          source: article.source_name,
          title: article.title,
          url: article.canonical_url,
        });
      }
    }
  }

  if (candidates.length === 0) {
    console.log("[AI-NEWS] No thumbnail backfill candidates found.");
    return;
  }

  const workerCount = Math.max(1, Math.min(FETCH_CONCURRENCY, candidates.length));
  const chunkSize = Math.ceil(candidates.length / workerCount);
  const chunks: CandidateArticle[][] = [];
  for (let i = 0; i < candidates.length; i += chunkSize) {
    chunks.push(candidates.slice(i, i + chunkSize));
  }

  await Promise.all(chunks.map((queue) => worker(queue)));

  console.log(
    `[AI-NEWS] Thumbnail backfill complete: updated=${updated} skipped=${skipped} failed=${failed}`
  );

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    logError("thumbnail-backfill", error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
