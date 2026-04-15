# AI News — Personalized AI News Briefs

A Next.js application that automatically collects, categorizes, and ranks news articles, then delivers personalized daily briefing emails based on individual user interests and behaviors.

## Tech Stack

- **Framework:** Next.js (App Router)
- **Language:** TypeScript
- **Auth:** Supabase Auth
- **Database:** PostgreSQL via Prisma ORM
- **Background Jobs:** Inngest
- **AI:** OpenAI API (GPT models for classification and summarization)
- **Error Tracking:** Sentry
- **Styling:** Tailwind CSS v4
- **Deployment:** Vercel

## Getting Started

### 1. Prerequisites

- Node.js 20+ and npm
- PostgreSQL database
- Supabase project (for auth)

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

### 4. Setup the Database

```bash
# Generate the Prisma client
npx prisma generate

# Push the schema to your database (or use `prisma migrate dev`)
npx prisma db push
```

> **Note:** If `prisma db push` fails due to no database connection, ensure `DATABASE_URL` is set correctly in `.env`. You can use the generated client without a live DB for development.

### 5. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Project Structure

```
├── prisma/
│   └── schema.prisma          # Database schema
├── prisma.config.ts           # Prisma 7 configuration
├── src/
│   ├── app/                   # Next.js App Router pages & layouts
│   ├── components/            # Reusable UI components
│   └── server/
│       ├── db/                # Database client & queries
│       ├── jobs/              # Inngest job definitions
│       ├── providers/         # External API integrations (OpenAI, Supabase, news sources)
│       ├── ranking/           # Article ranking algorithms
│       └── ai/                # AI classification & summarization logic
├── .env.example               # Environment variable template
└── README.md
```

## Database

The application uses the following main tables:

- **users** / **user_profiles** — User accounts and settings
- **user_topic_preferences** — Topic weights for personalization
- **linked_accounts** — OAuth-linked social accounts (X, Google)
- **interest_signals** — Behavioral signals for interest inference
- **articles** / **article_annotations** — Article catalog and AI-generated annotations
- **daily_briefs** / **daily_brief_items** — Personalized daily briefing data
- **feedback_events** — Like/dismiss signals for model feedback
- **job_runs** — Background job execution tracking
- **source_policies** — Source enable/disable and quality settings
- **feature_flags** — Runtime feature toggles

## Available Scripts

| Command            | Description                        |
| ------------------ | ---------------------------------- |
| `npm run dev`      | Start development server           |
| `npm run build`    | Production build                   |
| `npm run start`    | Start production server            |
| `npm run lint`     | Run ESLint                         |
| `npx prisma generate` | Generate Prisma client types    |
| `npx prisma db push`  | Push schema to database         |
| `npx prisma studio`   | Open Prisma Studio (DB GUI)     |
