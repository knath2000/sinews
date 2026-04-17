import { isSafariBriefProvenance, type SafariBriefProvenance } from "@/lib/safari-insights";

export type FeedArticleProvenance = SafariBriefProvenance;

export interface FeedArticleData {
  id: number;
  title: string;
  source_name: string;
  canonical_url: string;
  image_url: string | null;
  published_at: string | null;
  summary: string | null;
  why_recommended: string | null;
  matched_signals: string[] | null;
  provenance: FeedArticleProvenance | null;
  rank: number;
  score: number;
  brief_item_id: number;
}

export interface FeedPayload {
  articles: FeedArticleData[];
  generatedAt: string | null;
}

function parseFeedArticleData(value: unknown): FeedArticleData | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const article = value as Record<string, unknown>;

  if (
    typeof article.id !== "number" ||
    typeof article.title !== "string" ||
    typeof article.source_name !== "string" ||
    typeof article.canonical_url !== "string" ||
    !(article.image_url === null || typeof article.image_url === "string") ||
    !(article.published_at === null || typeof article.published_at === "string") ||
    !(article.summary === null || typeof article.summary === "string") ||
    !(article.why_recommended === null || typeof article.why_recommended === "string") ||
    !(
      article.matched_signals === null ||
      (Array.isArray(article.matched_signals) &&
        article.matched_signals.every((signal) => typeof signal === "string"))
    ) ||
    typeof article.rank !== "number" ||
    typeof article.score !== "number" ||
    typeof article.brief_item_id !== "number"
  ) {
    return null;
  }

  const provenance =
    article.provenance === null || article.provenance === undefined
      ? null
      : isSafariBriefProvenance(article.provenance)
        ? article.provenance
        : null;

  return {
    id: article.id,
    title: article.title,
    source_name: article.source_name,
    canonical_url: article.canonical_url,
    image_url: article.image_url,
    published_at: article.published_at,
    summary: article.summary,
    why_recommended: article.why_recommended,
    matched_signals: article.matched_signals,
    provenance,
    rank: article.rank,
    score: article.score,
    brief_item_id: article.brief_item_id,
  };
}

export function normalizeFeedPayload(value: unknown): FeedPayload | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const payload = value as Record<string, unknown>;
  if (!Array.isArray(payload.articles)) {
    return null;
  }

  const articles = payload.articles
    .map((article) => parseFeedArticleData(article))
    .filter((article): article is FeedArticleData => article !== null);
  if (articles.length !== payload.articles.length) {
    return null;
  }

  return {
    articles,
    generatedAt: typeof payload.generatedAt === "string" ? payload.generatedAt : null,
  };
}
