import { RawArticle } from "./article-loader";
import { APPROVED_RSS_FEEDS } from "./article-loader";

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    return u.toString();
  } catch {
    return url;
  }
}

/**
 * Fetch articles from TheNewsAPI
 */
export async function fetchFromTheNewsAPI(): Promise<RawArticle[]> {
  const apiKey = process.env.THENEWSAPI_API_KEY;
  if (!apiKey) {
    console.warn("THENEWSAPI_API_KEY not set - skipping TheNewsAPI fetch");
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

  return results.map((item: Record<string, unknown>) => {
    const url = normalizeUrl(
      (item.news_url as string) ?? (item.url as string) ?? ""
    );
    return {
      title: (item.title as string) ?? "",
      source: (item.source as string) ?? "Unknown",
      snippet: (item.text as string) ?? (item.summary as string) ?? null,
      canonical_url: url,
      published_at: item.date
        ? new Date(item.date as string)
        : null,
      language: (item.language as string) ?? "en",
      provider: "thenewsapi",
      license_class: null,
      image_url: (item.img_url as string) ?? (item.image_url as string) ?? null,
    };
  }).filter((a: RawArticle) => !!a.canonical_url && !!a.title);
}

/**
 * Parse an RSS/Atom feed and return raw articles
 */
export async function fetchFromRSS(
  feedName: string,
  feedUrl: string
): Promise<RawArticle[]> {
  const response = await fetch(feedUrl, {
    headers: { "User-Agent": "AI-News-Digest/1.0" },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    console.warn(`RSS fetch failed for ${feedName}: ${response.status}`);
    return [];
  }

  const xml = await response.text();
  return parseRSSXML(feedName, xml);
}

/**
 * Simple XML parser for RSS 2.0 and Atom feeds
 */
function parseRSSXML(feedName: string, xml: string): RawArticle[] {
  const articles: RawArticle[] = [];

  // RSS 2.0 items
  const rssItemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = rssItemRegex.exec(xml)) !== null) {
    const itemXml = match[1];
    const title = extractTag(itemXml, "title");
    const link = extractTag(itemXml, "link");
    const description = extractTag(itemXml, "description");
    const pubDate = extractTag(itemXml, "pubDate");
    const imgMatch = itemXml.match(/<media:content[^>]*url="([^"]*)"/i)
      ?? itemXml.match(/<enclosure[^>]*url="([^"]*)"/i);
    const imageUrl = imgMatch ? imgMatch[1] : null;

    if (title && link) {
      articles.push({
        title,
        source: feedName,
        snippet: stripHtml(description),
        canonical_url: normalizeUrl(link),
        published_at: pubDate ? new Date(pubDate) : undefined,
        language: "en",
        provider: "rss",
        license_class: null,
        image_url: imageUrl,
      });
    }
  }

  // Atom entries
  if (articles.length === 0) {
    const entryRegex = /<entry[^>]*>([\s\S]*?)<\/entry>/gi;
    while ((match = entryRegex.exec(xml)) !== null) {
      const entryXml = match[1];
      const title = extractTag(entryXml, "title");
      const linkMatch = entryXml.match(/href="([^"]*)"/i);
      const link = linkMatch ? linkMatch[1] : null;
      const summary = extractTag(entryXml, "summary") ?? extractTag(entryXml, "content");
      const published =
        extractTag(entryXml, "published") ?? extractTag(entryXml, "updated");

      if (title && link) {
        articles.push({
          title,
          source: feedName,
          snippet: stripHtml(summary),
          canonical_url: normalizeUrl(link),
          published_at: published ? new Date(published) : undefined,
          language: "en",
          provider: "rss",
          license_class: null,
          image_url: null,
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

function stripHtml(html: string | null): string | null {
  if (!html) return null;
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim()
    .slice(0, 500);
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
      const articles = await fetchFromRSS(feed.name, feed.url);
      allArticles.push(...articles);
    } catch (err) {
      console.warn(`Failed to fetch RSS feed ${feed.name}:`, err);
    }
  }

  return allArticles;
}
