import { RawArticle, APPROVED_RSS_FEEDS } from "./article-loader";
import { logError } from "./error-logger";
import { normalizePublicImageUrl, normalizePublicUrl } from "./url-utils";
import { extractFeedImageUrl, extractPageImageUrl } from "./image-utils";
import { sanitizeFeedSnippet, sanitizeFeedTitle } from "./text-utils";
import { isProbablyArticleImageUrl } from "@/lib/image-suitability";
export type { RawArticle } from "./article-loader";

const ARTICLE_IMAGE_FETCH_TIMEOUT_MS = 8000;
const ARTICLE_IMAGE_FETCH_CONCURRENCY = 5;

/**
 * Fetch articles from TheNewsAPI
 */
export async function fetchFromTheNewsAPI(): Promise<RawArticle[]> {
  const apiKey = process.env.THENEWSAPI_API_KEY;
  if (!apiKey) {
    logError("thenewsapi-missing-api-key", new Error("THENEWSAPI_API_KEY not set"));
    return [];
  }

  const queryParams = new URLSearchParams({
    apiKey: apiKey,
    countries: "us",
    languages: "en",
    categories: "technology",
    per_page: "100",
  });

  const response = await fetch(
    `https://eventregistry.news/api/news?${queryParams.toString()}`,
    {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(30000),
    }
  );

  if (!response.ok) {
    throw new Error(
      `TheNewsAPI returned ${response.status}: ${await response.text()}`
    );
  }

  const data = await response.json();
  const results = data?.results ?? [];

  const articles = results
    .map((item: Record<string, unknown>): RawArticle | null => {
      const rawUrl =
        typeof item.news_url === "string"
          ? item.news_url
          : typeof item.url === "string"
            ? item.url
            : "";
      const url = normalizePublicUrl(rawUrl);
      const title = sanitizeFeedTitle(
        typeof item.title === "string" ? item.title : null
      );
      const snippet = sanitizeFeedSnippet(
        typeof item.text === "string"
          ? item.text
          : typeof item.summary === "string"
            ? item.summary
            : null
      );
      const source = typeof item.source === "string" ? item.source : "Unknown";

      if (!url || !title) {
        logError("thenewsapi-invalid-article", new Error("Skipping article with invalid URL or title"), {
          title: item.title,
          source: item.source,
          url: rawUrl,
        });
        return null;
      }

      return {
        title,
        source,
        snippet,
        canonical_url: url,
        published_at:
          typeof item.date === "string" ? new Date(item.date) : null,
        language: typeof item.language === "string" ? item.language : "en",
        provider: "thenewsapi",
        license_class: null,
        image_url:
          normalizePublicImageUrl(
            typeof item.img_url === "string"
              ? item.img_url
              : typeof item.image_url === "string"
                ? item.image_url
                : "",
            url
          ) ?? null,
      };
    })
    .filter((a: RawArticle | null): a is RawArticle => !!a && !!a.canonical_url && !!a.title);

  return await enrichArticlesWithPageImages(articles);
}

/**
 * Parse an RSS/Atom feed and return raw articles
 */
export async function fetchFromRSS(
  feedName: string,
  feedUrl: string,
  allowedHosts: string[]
): Promise<RawArticle[]> {
  const response = await fetch(feedUrl, {
    headers: { "User-Agent": "AI-News-Digest/1.0" },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    logError(
      "rss-feed-fetch",
      new Error(`RSS fetch failed with status ${response.status}`),
      { feedName, feedUrl }
    );
    return [];
  }

  const xml = await response.text();
  return parseRSSXML(feedName, xml, allowedHosts);
}

/**
 * Simple XML parser for RSS 2.0 and Atom feeds
 */
function parseRSSXML(
  feedName: string,
  xml: string,
  allowedHosts: string[]
): RawArticle[] {
  const articles: RawArticle[] = [];

  // RSS 2.0 items
  const rssItemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = rssItemRegex.exec(xml)) !== null) {
    const itemXml = match[1];
    const title = sanitizeFeedTitle(extractTag(itemXml, "title"));
    const link = extractTag(itemXml, "link");
    const description = sanitizeFeedSnippet(extractTag(itemXml, "description"));
    const pubDate = extractTag(itemXml, "pubDate");
    if (title && link) {
      const canonicalUrl = normalizePublicUrl(link, allowedHosts);
      if (!canonicalUrl) {
        logError(
          "rss-entry-invalid-url",
          new Error("Skipping RSS entry with invalid or mismatched URL"),
          { feedName, title, link }
        );
        continue;
      }

      articles.push({
        title,
        source: feedName,
        snippet: description,
        canonical_url: canonicalUrl,
        image_url: extractFeedImageUrl(itemXml, canonicalUrl),
        published_at: pubDate ? new Date(pubDate) : undefined,
        language: "en",
        provider: "rss",
        license_class: null,
      });
    }
  }

  // Atom entries
  if (articles.length === 0) {
    const entryRegex = /<entry[^>]*>([\s\S]*?)<\/entry>/gi;
    while ((match = entryRegex.exec(xml)) !== null) {
      const entryXml = match[1];
      const title = sanitizeFeedTitle(extractTag(entryXml, "title"));
      const linkMatch = entryXml.match(/href="([^"]*)"/i);
      const link = linkMatch ? linkMatch[1] : null;
      const summary = sanitizeFeedSnippet(
        extractTag(entryXml, "summary") ?? extractTag(entryXml, "content")
      );
      const published =
        extractTag(entryXml, "published") ?? extractTag(entryXml, "updated");

      if (title && link) {
        const canonicalUrl = normalizePublicUrl(link, allowedHosts);
        if (!canonicalUrl) {
          logError(
            "atom-entry-invalid-url",
            new Error("Skipping Atom entry with invalid or mismatched URL"),
            { feedName, title, link }
          );
          continue;
        }

        articles.push({
          title,
          source: feedName,
          snippet: summary,
          canonical_url: canonicalUrl,
          image_url: extractFeedImageUrl(entryXml, canonicalUrl),
          published_at: published ? new Date(published) : undefined,
          language: "en",
          provider: "rss",
          license_class: null,
        });
      }
    }
  }

  return articles;
}

function extractTag(xml: string, tagName: string): string | null {
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i");
  const match = xml.match(regex);
  return match ? match[1]?.trim() ?? null : null;
}

/**
 * Fetch all approved RSS feeds
 */
/**
 * Fetch all approved RSS feeds
 */
export async function fetchAllRSSFeeds(): Promise<RawArticle[]> {
  const allArticles: RawArticle[] = [];

  for (const feed of APPROVED_RSS_FEEDS) {
    try {
      const articles = await fetchFromRSS(feed.name, feed.url, feed.allowedHosts);
      allArticles.push(...articles);
    } catch (err) {
      logError("rss-feed", err, { feedName: feed.name, feedUrl: feed.url });
    }
  }

  const deduped = dedupeRawArticles(allArticles);
  return await enrichArticlesWithPageImages(deduped);
}

function dedupeRawArticles(articles: RawArticle[]): RawArticle[] {
  const seen = new Set<string>();
  const deduped: RawArticle[] = [];

  for (const article of articles) {
    if (seen.has(article.canonical_url)) {
      continue;
    }
    seen.add(article.canonical_url);
    deduped.push(article);
  }

  return deduped;
}

export async function fetchArticlePageImageUrl(
  articleUrl: string
): Promise<string | null> {
  try {
    const response = await fetch(articleUrl, {
      headers: { "User-Agent": "AI-News-Digest/1.0", accept: "text/html,application/xhtml+xml" },
      signal: AbortSignal.timeout(ARTICLE_IMAGE_FETCH_TIMEOUT_MS),
    });

    if (!response.ok) {
      logError(
        "article-image-fetch",
        new Error(`Article page fetch failed with status ${response.status}`),
        { articleUrl }
      );
      return null;
    }

    const html = await response.text();
    const imageUrl = extractPageImageUrl(html, articleUrl);
    return imageUrl && isProbablyArticleImageUrl(imageUrl) ? imageUrl : null;
  } catch (err) {
    logError("article-image-fetch", err, { articleUrl });
    return null;
  }
}

export async function enrichArticlesWithPageImages(
  articles: RawArticle[]
): Promise<RawArticle[]> {
  const normalized = articles.map((article) => ({
    ...article,
    image_url:
      normalizePublicImageUrl(article.image_url ?? "", article.canonical_url) ??
      null,
  }));

  const cache = new Map<string, Promise<string | null>>();
  const result = new Array<RawArticle>(normalized.length);
  let index = 0;

  async function getFallbackImage(articleUrl: string): Promise<string | null> {
    const existing = cache.get(articleUrl);
    if (existing) return existing;

    const promise = fetchArticlePageImageUrl(articleUrl);
    cache.set(articleUrl, promise);
    return promise;
  }

  async function worker(): Promise<void> {
    while (index < normalized.length) {
      const currentIndex = index;
      index += 1;
      const article = normalized[currentIndex];

      let imageUrl = article.image_url;
      if (!imageUrl) {
        imageUrl = await getFallbackImage(article.canonical_url);
      }

      if (imageUrl && !isProbablyArticleImageUrl(imageUrl)) {
        imageUrl = null;
      }

      result[currentIndex] = {
        ...article,
        image_url: imageUrl,
      };
    }
  }

  const workerCount = Math.min(ARTICLE_IMAGE_FETCH_CONCURRENCY, normalized.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  return result;
}
