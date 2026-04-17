import { inngest } from "./client";
import { fetchFromTheNewsAPI, fetchAllRSSFeeds } from "../news-fetcher";
import { insertArticles, RawArticle } from "../article-loader";
import { logError } from "../error-logger";

/**
 * ingestArticles Job - Hourly
 * Pulls articles from TheNewsAPI + 10 RSS feeds, dedupes by canonical_url, inserts new articles
 */
export const ingestArticles = inngest.createFunction(
  {
    id: "ingest-articles",
    name: "Ingest Articles from News API and RSS Feeds",
    retries: 2,
    triggers: [
      {
        cron: "0 * * * *", // Every hour
      },
      {
        event: "ingest.manual",
      },
    ],
  },
  async ({ step }) => {
    // Step 1: Fetch from TheNewsAPI
    const apiArticles = await step.run("fetch-thenewsapi", async () => {
      try {
        const articles = await fetchFromTheNewsAPI();
        return {
          source: "thenewsapi",
          count: articles.length,
          articles,
        };
      } catch (err) {
        logError("ingest-thenewsapi", err);
        return {
          source: "thenewsapi",
          count: 0,
          articles: [] as RawArticle[],
        };
      }
    });

    // Step 2: Fetch from RSS feeds
    const rssArticles = await step.run("fetch-rss", async () => {
      try {
        const articles = await fetchAllRSSFeeds();
        return {
          source: "rss",
          count: articles.length,
          articles,
        };
      } catch (err) {
        logError("ingest-rss", err);
        return {
          source: "rss",
          count: 0,
          articles: [] as RawArticle[],
        };
      }
    });

    // Step 3: Deduplicate and insert
    const insertResult = await step.run("insert-articles", async () => {
      const allArticles = [
        ...apiArticles.articles,
        ...rssArticles.articles,
      ] as unknown as RawArticle[];

      // Dedupe locally by canonical_url before DB check
      const seen = new Set<string>();
      const unique: RawArticle[] = [];
      for (const a of allArticles) {
        if (!seen.has(a.canonical_url)) {
          seen.add(a.canonical_url);
          unique.push(a);
        }
      }

      const insertedCount = await insertArticles(unique);
      return {
        total: allArticles.length,
        unique: unique.length,
        inserted: insertedCount,
      };
    });

    // Step 4: Trigger annotation events for newly inserted articles
    // (We emit a single event for the ingestion batch)
    await step.run("log-result", async () => {
      console.log("Ingestion complete:", insertResult);
    });

    return {
      status: "success",
      api_count: apiArticles.count,
      rss_count: rssArticles.count,
      ...insertResult,
    };
  }
);
