CREATE TABLE "archived_articles" (
    "id" INTEGER NOT NULL,
    "canonical_url" TEXT NOT NULL,
    "source_name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "snippet" TEXT,
    "published_at" TIMESTAMPTZ(6),
    "language" TEXT NOT NULL DEFAULT 'en',
    "provider" TEXT NOT NULL,
    "is_fixture" BOOLEAN NOT NULL DEFAULT false,
    "license_class" TEXT,
    "image_url" TEXT,
    "cluster_id" TEXT,
    "editorial_priority" INTEGER NOT NULL DEFAULT 3,
    "blocked_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL,
    "topics_json" TEXT,
    "entities_json" TEXT,
    "quality_score" INTEGER,
    "dedupe_key" TEXT,
    "summary" TEXT,
    "tldr" TEXT,
    "archived_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "archived_articles_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "archived_articles_canonical_url_idx" ON "archived_articles"("canonical_url");
CREATE INDEX "archived_articles_published_at_idx" ON "archived_articles"("published_at");
CREATE INDEX "archived_articles_archived_at_idx" ON "archived_articles"("archived_at");

ALTER TABLE "daily_brief_items"
ADD COLUMN "archived_article_id" INTEGER;

ALTER TABLE "feedback_events"
ADD COLUMN "archived_article_id" INTEGER;

DROP INDEX IF EXISTS "daily_brief_items_archived_article_id_idx";
DROP INDEX IF EXISTS "feedback_events_archived_article_id_idx";

CREATE INDEX "daily_brief_items_archived_article_id_idx" ON "daily_brief_items"("archived_article_id");
CREATE INDEX "feedback_events_archived_article_id_idx" ON "feedback_events"("archived_article_id");

ALTER TABLE "daily_brief_items"
DROP CONSTRAINT "daily_brief_items_article_id_fkey";

ALTER TABLE "feedback_events"
DROP CONSTRAINT "feedback_events_article_id_fkey";

ALTER TABLE "daily_brief_items"
ADD CONSTRAINT "daily_brief_items_article_id_fkey"
FOREIGN KEY ("article_id") REFERENCES "articles"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "daily_brief_items"
ADD CONSTRAINT "daily_brief_items_archived_article_id_fkey"
FOREIGN KEY ("archived_article_id") REFERENCES "archived_articles"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "feedback_events"
ADD CONSTRAINT "feedback_events_article_id_fkey"
FOREIGN KEY ("article_id") REFERENCES "articles"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "feedback_events"
ADD CONSTRAINT "feedback_events_archived_article_id_fkey"
FOREIGN KEY ("archived_article_id") REFERENCES "archived_articles"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
