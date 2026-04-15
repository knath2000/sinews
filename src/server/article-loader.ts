import { db } from "./db/client";

// 10 approved RSS feeds for AI news
export const APPROVED_RSS_FEEDS = [
  {
    name: "TechCrunch",
    url: "https://techcrunch.com/feed/",
    licenseClass: "standard",
  },
  {
    name: "The Verge",
    url: "https://www.theverge.com/rss/index.xml",
    licenseClass: "standard",
  },
  {
    name: "Ars Technica",
    url: "https://feeds.arstechnica.com/arstechnica/index",
    licenseClass: "standard",
  },
  {
    name: "Wired",
    url: "https://www.wired.com/feed/rss",
    licenseClass: "standard",
  },
  {
    name: "MIT Technology Review",
    url: "https://www.technologyreview.com/feed/",
    licenseClass: "standard",
  },
  {
    name: "VentureBeat",
    url: "https://venturebeat.com/feed/",
    licenseClass: "standard",
  },
  {
    name: "The Register",
    url: "https://www.theregister.co.uk/headlines.atom",
    licenseClass: "standard",
  },
  {
    name: "ZDNet",
    url: "https://www.zdnet.com/news/rss.xml",
    licenseClass: "standard",
  },
  {
    name: "Engadget",
    url: "https://www.engadget.com/rss.xml",
    licenseClass: "standard",
  },
  {
    name: "OpenAI Blog",
    url: "https://openai.com/blog/rss.xml",
    licenseClass: "standard",
  },
];

export interface RawArticle {
  title: string;
  source: string;
  snippet?: string | null;
  canonical_url: string;
  published_at?: Date | null;
  language?: string;
  provider: string;
  license_class?: string | null;
  image_url?: string | null;
}

// Check if an article already exists (dedupe by canonical_url)
export async function articleExists(
  canonicalUrl: string
): Promise<boolean> {
  const existing = await db.articles.findFirst({
    where: { canonical_url: canonicalUrl },
    select: { id: true },
  });
  return existing !== null;
}

// Insert a batch of articles, skipping duplicates
export async function insertArticles(
  articles: RawArticle[]
): Promise<number> {
  if (articles.length === 0) return 0;

  const urls = articles.map((a) => a.canonical_url);
  const existing = await db.articles.findMany({
    where: { canonical_url: { in: urls } },
    select: { canonical_url: true },
  });
  const existingUrls = new Set(existing.map((e) => e.canonical_url));
  const newArticles = articles.filter(
    (a) => !existingUrls.has(a.canonical_url)
  );

  if (newArticles.length === 0) return 0;

  await db.articles.createMany({
    data: newArticles.map((a) => ({
      canonical_url: a.canonical_url,
      source_name: a.source,
      title: a.title,
      snippet: a.snippet,
      published_at: a.published_at,
      language: a.language ?? "en",
      provider: a.provider,
      license_class: a.license_class,
      image_url: a.image_url,
    })),
  });

  return newArticles.length;
}
