-- Step 1: Add replacement_outcome column to daily_brief_items
ALTER TABLE "daily_brief_items"
ADD COLUMN "replacement_outcome" TEXT;

-- Step 2: Clean up existing duplicate article_ids within the same brief.
-- For any two items in the same brief pointing at the same article_id,
-- keep the row with the lower id and delete the other.
DELETE FROM "daily_brief_items" AS target
WHERE target.id IN (
  SELECT dup.id FROM "daily_brief_items" dup
  JOIN "daily_brief_items" keeper
    ON dup.daily_brief_id = keeper.daily_brief_id
   AND dup.article_id IS NOT NULL
   AND dup.article_id = keeper.article_id
   AND dup.id > keeper.id
);

-- Step 3: Clean up existing duplicate archived_article_ids within the same brief.
DELETE FROM "daily_brief_items" AS target
WHERE target.id IN (
  SELECT dup.id FROM "daily_brief_items" dup
  JOIN "daily_brief_items" keeper
    ON dup.daily_brief_id = keeper.daily_brief_id
   AND dup.archived_article_id IS NOT NULL
   AND dup.archived_article_id = keeper.archived_article_id
   AND dup.id > keeper.id
);

-- Step 4: Add partial unique indexes to prevent future duplicates.
-- Only applies to non-null article_id/archived_article_id within the same brief.
CREATE UNIQUE INDEX "daily_brief_items_brief_id_article_id_key"
ON "daily_brief_items"("daily_brief_id", "article_id")
WHERE article_id IS NOT NULL;

CREATE UNIQUE INDEX "daily_brief_items_brief_id_archived_article_id_key"
ON "daily_brief_items"("daily_brief_id", "archived_article_id")
WHERE archived_article_id IS NOT NULL;
