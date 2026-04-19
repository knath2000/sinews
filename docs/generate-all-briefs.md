# Generate Briefs for All Users

## Context
Users who signed up while the annotation pipeline was broken may have empty briefs or none at all. The `generateAllDailyBriefs` cron only runs at noon UTC — this manual trigger lets admins generate briefs for all active users on demand.

## How it works

### API Route
- `POST /api/admin/generate-all-briefs` — admin-only
- Finds all users with profiles
- Sequentially calls `generateDailyBriefForUser(userId)` for each
- The `generateDailyBriefForUser` function has its own built-in check: if a brief already exists with `status='completed'` for today, it returns immediately without regenerating
- Returns JSON with generated/failed counts

### Inngest Job
- `generateAllUserBriefs` (id: `generate-all-user-briefs`)
- Triggered by `admin.generate-all-briefs` event
- Concurrency limit: 2 (to avoid overwhelming the DB)
- Finds users without completed briefs today using:
  ```prisma
  where: { user_id, status: "completed", generated_at: { gte: 24h ago } }
  ```
- Enqueues individual `daily-brief.triggered` events for each user needing a brief

## When to use

1. **After fixing annotation issues** — once all articles are annotated, run this to give every user a fresh, fully-annotated brief
2. **After manual seed/backfill** — if you've added new articles and want users to see them
3. **Emergency catch-up** — if the cron missed its window

## How to run

### Option A: Direct API call (synchronous, admin UI can visit)
```bash
curl -X POST https://sinews.vercel.app/api/admin/generate-all-briefs
```

### Option B: Trigger Inngest event (background, async)
```bash
# Use Inngest dashboard or CLI to send event:
inngest send --name "admin.generate-all-briefs" --data '{}'
```

## Expected output

```json
{
  "status": "complete",
  "message": "Generated 3/5 briefs.",
  "generated_count": 3,
  "failed_count": 2,
  "failed_users": ["user1@example.com", "user2@example.com"]
}
```

## Important notes

- This does **not** regenerate briefs for users who already have completed briefs today — `generateDailyBriefForUser` has a cache check that returns the existing brief immediately
- Failed briefs (status: "failed") will be retried since they don't match the "completed" check
- If briefs are still failing, check Inngest logs for the specific error (likely annotation issues or OpenRouter errors)
- The sequential API approach is intentional: it avoids DB connection pool exhaustion that would happen with parallel `Promise.all` calls

## Related

- Brief engine: `src/server/brief-engine.ts`
- Admin force-annotations: `/api/admin/force-annotations` (triggers batch annotation resync)
- Inngest batch annotation: `src/server/inngest/brief-generator.ts` → `batchAnnotateArticles`
