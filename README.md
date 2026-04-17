# AI News

Personalized AI news briefings built with Next.js, Supabase, Prisma, Inngest, and OpenAI.

## Stack

- Next.js App Router
- TypeScript
- Prisma + Postgres
- Supabase Auth + Storage
- Inngest background jobs
- OpenAI for article classification and brief summaries
- Tailwind CSS v4
- Vercel deployment

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Configure environment variables:

```bash
cp .env.example .env
```

3. Generate the Prisma client and apply schema changes:

```bash
npx prisma generate
npx prisma migrate deploy
```

4. Run the app:

```bash
npm run dev
```

## Vercel Deployment

The repo is configured so Vercel can build it directly from Git:

- `postinstall` runs `prisma generate`
- `next.config.ts` pins `turbopack.root` to the project directory
- OAuth callbacks resolve their host from `APP_BASE_URL`, then Vercel envs, then the incoming request origin

### Required Vercel Environment Variables

Set these in the Vercel project before the first production deploy:

- `DATABASE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ACCOUNT_TOKEN_ENCRYPTION_KEY`
- `OPENAI_API_KEY`
- `APP_BASE_URL`

### Usually Required Depending On Enabled Features

- `OPENAI_SUMMARY_MODEL`
- `OPENAI_CLASSIFIER_MODEL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `X_CLIENT_ID`
- `X_CLIENT_SECRET`
- `THENEWSAPI_API_KEY`
- `INNGEST_EVENT_KEY`
- `INNGEST_SIGNING_KEY`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `SENTRY_DSN`
- `NEXT_PUBLIC_SENTRY_DSN`
- `SENTRY_ORG`
- `SENTRY_PROJECT`

### Vercel Project Settings

- Framework preset: `Next.js`
- Install command: default
- Build command: default (`npm run build`)
- Output directory: default

Set `APP_BASE_URL` to the production domain you register with Google/X OAuth, for example:

```bash
https://your-project.vercel.app
```

If you attach a custom domain, update `APP_BASE_URL` and the provider redirect URIs to that domain.

### Database Migrations

Vercel builds should not be responsible for changing production schema. Run:

```bash
npx prisma migrate deploy
```

against the production database as part of your release workflow before or alongside the deploy.

## Verification

These checks passed against the current repo state:

```bash
npm run build
npx tsc --noEmit
```
