import { Prisma } from "@prisma/client";
import { db } from "./db/client";

export type ArticleSnapshot = {
  id: number;
  canonical_url: string;
  source_name: string;
  title: string;
  snippet: string | null;
  published_at: Date | null;
  language: string;
  provider: string;
  is_fixture: boolean;
  license_class: string | null;
  image_url: string | null;
  cluster_id: string | null;
  editorial_priority: number;
  blocked_reason: string | null;
  created_at: Date;
  topics_json: string | null;
  entities_json: string | null;
  quality_score: number | null;
  dedupe_key: string | null;
  summary: string | null;
  tldr: string | null;
  isArchived: boolean;
};

type CurrentArticleForArchive = {
  id: number;
  canonical_url: string;
  source_name: string;
  title: string;
  snippet: string | null;
  published_at: Date | null;
  language: string;
  provider: string;
  is_fixture: boolean;
  license_class: string | null;
  image_url: string | null;
  cluster_id: string | null;
  editorial_priority: number;
  blocked_reason: string | null;
  created_at: Date;
  article_annotations: {
    topics_json: string | null;
    entities_json: string | null;
    quality_score: number | null;
    dedupe_key: string | null;
    summary: string | null;
    tldr: string | null;
  } | null;
};

type ArchiveStats = {
  archived_articles: number;
  moved_brief_items: number;
  moved_feedback_events: number;
};

const ARCHIVE_BATCH_SIZE = 200;

export function getCurrentArticleCutoff(now: Date = new Date()): Date {
  return new Date(now.getTime() - 24 * 60 * 60 * 1000);
}

function toArchiveData(article: CurrentArticleForArchive, archivedAt: Date) {
  const annotation = article.article_annotations;

  return {
    id: article.id,
    canonical_url: article.canonical_url,
    source_name: article.source_name,
    title: article.title,
    snippet: article.snippet,
    published_at: article.published_at,
    language: article.language,
    provider: article.provider,
    is_fixture: article.is_fixture,
    license_class: article.license_class,
    image_url: article.image_url,
    cluster_id: article.cluster_id,
    editorial_priority: article.editorial_priority,
    blocked_reason: article.blocked_reason,
    created_at: article.created_at,
    topics_json: annotation?.topics_json ?? null,
    entities_json: annotation?.entities_json ?? null,
    quality_score: annotation?.quality_score ?? null,
    dedupe_key: annotation?.dedupe_key ?? null,
    summary: annotation?.summary ?? null,
    tldr: annotation?.tldr ?? null,
    archived_at: archivedAt,
  };
}

async function archiveArticlesInternal(
  articles: CurrentArticleForArchive[],
  archivedAt: Date
): Promise<ArchiveStats> {
  const ids = articles.map((article) => article.id);
  const archiveRows = articles.map((article) => toArchiveData(article, archivedAt));

  const archivedResult = await db.archived_articles.createMany({
    data: archiveRows,
    skipDuplicates: true,
  });

  const movedBriefItems = await db.$executeRaw<number>(Prisma.sql`
    UPDATE "daily_brief_items"
    SET "archived_article_id" = "article_id",
        "article_id" = NULL
    WHERE "article_id" IN (${Prisma.join(ids)})
  `);

  const movedFeedbackEvents = await db.$executeRaw<number>(Prisma.sql`
    UPDATE "feedback_events"
    SET "archived_article_id" = "article_id",
        "article_id" = NULL
    WHERE "article_id" IN (${Prisma.join(ids)})
  `);

  await db.article_annotations.deleteMany({
    where: { article_id: { in: ids } },
  });

  await db.articles.deleteMany({
    where: { id: { in: ids } },
  });

  return {
    archived_articles: archivedResult.count,
    moved_brief_items: movedBriefItems,
    moved_feedback_events: movedFeedbackEvents,
  };
}

async function fetchStaleArticles(cutoff: Date): Promise<CurrentArticleForArchive[]> {
  return await db.articles.findMany({
    where: {
      is_fixture: false,
      OR: [
        { published_at: { lt: cutoff } },
        {
          published_at: null,
          created_at: { lt: cutoff },
        },
      ],
    },
    orderBy: [
      { published_at: "asc" },
      { created_at: "asc" },
      { id: "asc" },
    ],
    take: ARCHIVE_BATCH_SIZE,
    include: {
      article_annotations: {
        select: {
          topics_json: true,
          entities_json: true,
          quality_score: true,
          dedupe_key: true,
          summary: true,
          tldr: true,
        },
      },
    },
  }) as CurrentArticleForArchive[];
}

export async function archiveOldArticles(now: Date = new Date()): Promise<ArchiveStats> {
  const cutoff = getCurrentArticleCutoff(now);
  const totals: ArchiveStats = {
    archived_articles: 0,
    moved_brief_items: 0,
    moved_feedback_events: 0,
  };

  while (true) {
    const staleArticles = await fetchStaleArticles(cutoff);
    if (staleArticles.length === 0) {
      return totals;
    }

    const batch = await archiveArticlesInternal(staleArticles, now);
    totals.archived_articles += batch.archived_articles;
    totals.moved_brief_items += batch.moved_brief_items;
    totals.moved_feedback_events += batch.moved_feedback_events;
  }
}

export async function archiveArticlesByIds(
  articleIds: number[],
  now: Date = new Date()
): Promise<ArchiveStats> {
  if (articleIds.length === 0) {
    return {
      archived_articles: 0,
      moved_brief_items: 0,
      moved_feedback_events: 0,
    };
  }

  const articles = await db.articles.findMany({
    where: {
      id: { in: articleIds },
      is_fixture: false,
    },
    include: {
      article_annotations: {
        select: {
          topics_json: true,
          entities_json: true,
          quality_score: true,
          dedupe_key: true,
          summary: true,
          tldr: true,
        },
      },
    },
  }) as CurrentArticleForArchive[];

  if (articles.length === 0) {
    return {
      archived_articles: 0,
      moved_brief_items: 0,
      moved_feedback_events: 0,
    };
  }

  return await archiveArticlesInternal(articles, now);
}

export async function getArticleSnapshotById(articleId: number): Promise<ArticleSnapshot | null> {
  const current = await db.articles.findUnique({
    where: { id: articleId },
    select: {
      id: true,
      canonical_url: true,
      source_name: true,
      title: true,
      snippet: true,
      published_at: true,
      language: true,
      provider: true,
      is_fixture: true,
      license_class: true,
      image_url: true,
      cluster_id: true,
      editorial_priority: true,
      blocked_reason: true,
      created_at: true,
      article_annotations: {
        select: {
          topics_json: true,
          entities_json: true,
          quality_score: true,
          dedupe_key: true,
          summary: true,
          tldr: true,
        },
      },
    },
  });

  if (current) {
    return {
      id: current.id,
      canonical_url: current.canonical_url,
      source_name: current.source_name,
      title: current.title,
      snippet: current.snippet,
      published_at: current.published_at,
      language: current.language,
      provider: current.provider,
      is_fixture: current.is_fixture,
      license_class: current.license_class,
      image_url: current.image_url,
      cluster_id: current.cluster_id,
      editorial_priority: current.editorial_priority,
      blocked_reason: current.blocked_reason,
      created_at: current.created_at,
      topics_json: current.article_annotations?.topics_json ?? null,
      entities_json: current.article_annotations?.entities_json ?? null,
      quality_score: current.article_annotations?.quality_score ?? null,
      dedupe_key: current.article_annotations?.dedupe_key ?? null,
      summary: current.article_annotations?.summary ?? null,
      tldr: current.article_annotations?.tldr ?? null,
      isArchived: false,
    };
  }

  const archived = await db.archived_articles.findUnique({
    where: { id: articleId },
  });

  if (!archived) {
    return null;
  }

  return {
    id: archived.id,
    canonical_url: archived.canonical_url,
    source_name: archived.source_name,
    title: archived.title,
    snippet: archived.snippet,
    published_at: archived.published_at,
    language: archived.language,
    provider: archived.provider,
    is_fixture: archived.is_fixture,
    license_class: archived.license_class,
    image_url: archived.image_url,
    cluster_id: archived.cluster_id,
    editorial_priority: archived.editorial_priority,
    blocked_reason: archived.blocked_reason,
    created_at: archived.created_at,
    topics_json: archived.topics_json,
    entities_json: archived.entities_json,
    quality_score: archived.quality_score,
    dedupe_key: archived.dedupe_key,
    summary: archived.summary,
    tldr: archived.tldr,
    isArchived: true,
  };
}
