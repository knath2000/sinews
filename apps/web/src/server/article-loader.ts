import { db } from "./db/client";
import { normalizePublicImageUrl } from "./url-utils";
import { sanitizeFeedSnippet, sanitizeFeedTitle } from "./text-utils";

export type ApprovedRssFeed = {
  name: string;
  url: string;
  licenseClass: string;
  allowedHosts: string[];
};

// 10 approved RSS feeds for AI news
export const APPROVED_RSS_FEEDS: ApprovedRssFeed[] = [
  {
    name: "TechCrunch",
    url: "https://techcrunch.com/feed/",
    licenseClass: "standard",
    allowedHosts: ["techcrunch.com"],
  },
  {
    name: "The Verge",
    url: "https://www.theverge.com/rss/index.xml",
    licenseClass: "standard",
    allowedHosts: ["theverge.com"],
  },
  {
    name: "Ars Technica",
    url: "https://feeds.arstechnica.com/arstechnica/index",
    licenseClass: "standard",
    allowedHosts: ["arstechnica.com"],
  },
  {
    name: "Wired",
    url: "https://www.wired.com/feed/rss",
    licenseClass: "standard",
    allowedHosts: ["wired.com"],
  },
  {
    name: "MIT Technology Review",
    url: "https://www.technologyreview.com/feed/",
    licenseClass: "standard",
    allowedHosts: ["technologyreview.com"],
  },
  {
    name: "VentureBeat",
    url: "https://venturebeat.com/feed/",
    licenseClass: "standard",
    allowedHosts: ["venturebeat.com"],
  },
  {
    name: "The Register",
    url: "https://www.theregister.co.uk/headlines.atom",
    licenseClass: "standard",
    allowedHosts: ["theregister.co.uk", "theregister.com"],
  },
  {
    name: "ZDNet",
    url: "https://www.zdnet.com/news/rss.xml",
    licenseClass: "standard",
    allowedHosts: ["zdnet.com"],
  },
  {
    name: "Engadget",
    url: "https://www.engadget.com/rss.xml",
    licenseClass: "standard",
    allowedHosts: ["engadget.com"],
  },
  {
    name: "OpenAI Blog",
    url: "https://openai.com/blog/rss.xml",
    licenseClass: "standard",
    allowedHosts: ["openai.com"],
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
  is_fixture?: boolean;
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
  const existingUrls = new Set(existing.map((e: { canonical_url: string }) => e.canonical_url));
  const newArticles = articles.filter(
    (a) => !existingUrls.has(a.canonical_url)
  );

  if (newArticles.length === 0) return 0;

  await db.articles.createMany({
      data: newArticles.map((a) => ({
        title: sanitizeFeedTitle(a.title) ?? (a.title.trim() || "Untitled"),
        snippet: sanitizeFeedSnippet(a.snippet),
        canonical_url: a.canonical_url,
        source_name: a.source,
        published_at: a.published_at,
        language: a.language ?? "en",
        provider: a.provider,
        is_fixture: a.is_fixture ?? false,
        license_class: a.license_class,
        image_url:
          normalizePublicImageUrl(a.image_url ?? "", a.canonical_url) ?? null,
      })),
  });

  return newArticles.length;
}
