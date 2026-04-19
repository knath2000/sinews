import OpenAI from "openai";
import { db } from "./db/client";
import { Prisma } from "@prisma/client";
import { SIGNAL_WEIGHTS } from "./taxonomy";
import { isFeatureEnabled } from "./feature-flags";
import { HISTORY_IMPORT_DOMAIN_WEIGHT_CAP } from "@/lib/constants";
import { fetchAllRSSFeeds } from "./news-fetcher";
import { logError } from "./error-logger";
import { isFixtureArticle } from "./fixture-utils";
import type { RawArticle } from "./article-loader";
import { normalizePublicImageUrl } from "./url-utils";
import { classifyArticle } from "./article-classifier";
import { sanitizeFeedSnippet, sanitizeFeedTitle } from "./text-utils";
import { buildBriefItemProvenance } from "@/lib/safari-insights";
import { updateBriefProgress as updateBriefProgressDb } from "@/lib/brief-progress-db";
import { PHASE_MESSAGES } from "@/lib/brief-progress";
import { getTodayBriefDate, getYesterdayBriefDate, getYesterdayBriefDateForUser, getTodayBriefDateForUser } from "@/lib/brief-date";

// Re-export for backwards compat through feed-loader re-exports.
const updateBriefProgress = updateBriefProgressDb;


const SUMMARY_MODEL =
  process.env.OPENAI_SUMMARY_MODEL || "gpt-4o-mini";

let _summaryClient: OpenAI | undefined;
function getSummaryClient(): OpenAI {
  if (!_summaryClient) {
    const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;
    const isRouter = !!process.env.OPENROUTER_API_KEY;
    _summaryClient = new OpenAI({
      ...(isRouter ? {
        baseURL: "https://openrouter.ai/api/v1",
        defaultHeaders: {
          "HTTP-Referer": "https://sinews.vercel.app",
          "X-Title": "AI News Brief",
        },
      } : {}),
      apiKey: apiKey,
    });
  }
  return _summaryClient;
}

export interface ScoredCandidate {
  article_id: number;
  title: string;
  source_name: string;
  published_at: Date | null;
  topics: string[];
  entities: string[];
  quality_score: number;
  dedupe_key: string;
  cluster_id: string | null;
  cached_summary: string | null;
  cached_tldr: string | null;
  /** Composite score 0-1 */
  score: number;
}

export interface BriefItemInput {
  article_title: string;
  article_source: string;
  article_snippet: string | null;
  matched_topics: string[];
  matched_entities: string[];
}

export interface GeneratedBriefItem {
  summary: string;
  tldr: string;
  why_recommended: string;
}

type CandidateAnnotationRow = {
  article: {
    id: number;
    title: string;
    source_name: string;
    canonical_url: string;
    published_at: Date | null;
    cluster_id: string | null;
    provider: string;
    license_class: string | null;
    is_fixture: boolean;
  };
  topics_json: string | null;
  entities_json: string | null;
  quality_score: number | null;
  dedupe_key: string | null;
  summary: string | null;
  tldr: string | null;
};

type ExistingArticleUrlRow = {
  canonical_url: string;
};

/**
 * Calculate user interest signals weights for topics and entities.
 * Builds a weighted profile from interest_signals, user_topic_preferences,
 * and recent feedback_events (7-day rolling window).
 */
export async function buildUserProfile(userId: string): Promise<{
  topicWeights: Map<string, number>;
  entityWeights: Map<string, number>;
  safariHistoryImport: {
    topicWeights: Map<string, number>;
    topicDomainWeights: Map<string, Map<string, number>>;
  };
}> {
  const topicWeights = new Map<string, number>();
  const entityWeights = new Map<string, number>();
  const safariTopicDomainRawWeights = new Map<string, Map<string, number>>();
  const now = new Date();

  // Weighted topic preferences
  const preferences = await db.user_topic_preferences.findMany({
    where: { user_id: userId },
  });

  for (const pref of preferences) {
    const existing = topicWeights.get(pref.topic) ?? 0;
    topicWeights.set(pref.topic, existing + pref.weight * SIGNAL_WEIGHTS.manual_topic);
  }

  // Interest signals with signal strength and weight
  const signals = await db.interest_signals.findMany({
    where: {
      user_id: userId,
      OR: [{ expires_at: null }, { expires_at: { gte: now } }],
    },
  });

  for (const signal of signals) {
    const base = signal.weight;
    let multiplier = 1.0;

    switch (signal.signal_type) {
      case "thumbs_up":
        multiplier = SIGNAL_WEIGHTS.thumbs_up;
        break;
      case "thumbs_down":
        multiplier = SIGNAL_WEIGHTS.thumbs_down;
        break;
      case "x_follow":
      case "x_follows":
        multiplier = SIGNAL_WEIGHTS.x_follows;
        break;
      case "x_like":
      case "x_bookmark":
      case "x_like_bookmark":
        multiplier = SIGNAL_WEIGHTS.x_like_bookmark;
        break;
      case "google_profile":
      case "google_org":
      case "google_profile_org":
        multiplier = SIGNAL_WEIGHTS.google_profile_org;
        break;
    }

    if (signal.normalized_topic) {
      const existing = topicWeights.get(signal.normalized_topic) ?? 0;
      topicWeights.set(signal.normalized_topic, existing + base * multiplier);
    }
    if (signal.entity) {
      const existing = entityWeights.get(signal.entity) ?? 0;
      entityWeights.set(signal.entity, existing + base * multiplier);
    }
  }

  // Cap Safari history import signals per domain-topic pair
  for (const signal of signals) {
    if (
      signal.signal_type !== "safari_history_import" ||
      !signal.normalized_topic ||
      !signal.raw_value
    ) {
      continue;
    }

    const domain = signal.raw_value;
    const topic = signal.normalized_topic;
    if (!safariTopicDomainRawWeights.has(topic)) {
      safariTopicDomainRawWeights.set(topic, new Map());
    }
    const domainMap = safariTopicDomainRawWeights.get(topic)!;
    domainMap.set(domain, (domainMap.get(domain) ?? 0) + signal.weight);
  }

  const safariTopicWeights = new Map<string, number>();
  const safariTopicDomainWeights = new Map<string, Map<string, number>>();
  for (const [topic, domainMap] of safariTopicDomainRawWeights) {
    const cappedDomainWeights = new Map<string, number>();
    for (const [domain, totalWeight] of domainMap) {
      const capped = Math.min(totalWeight, HISTORY_IMPORT_DOMAIN_WEIGHT_CAP);
      cappedDomainWeights.set(domain, capped);
      safariTopicWeights.set(topic, (safariTopicWeights.get(topic) ?? 0) + capped);
      topicWeights.set(topic, (topicWeights.get(topic) ?? 0) - totalWeight + capped);
    }
    safariTopicDomainWeights.set(topic, cappedDomainWeights);
  }

  return {
    topicWeights,
    entityWeights,
    safariHistoryImport: {
      topicWeights: safariTopicWeights,
      topicDomainWeights: safariTopicDomainWeights,
    },
  };
}

/**
 * Fetch yesterday's brief topics for a given user.
 * Used for novelty bonus calculation.
 */
export async function getYesterdayBriefTopics(userId: string): Promise<Set<string>> {
  const yesterday = await getYesterdayBriefDateForUser(userId);

  const brief = await db.daily_briefs.findFirst({
    where: {
      user_id: userId,
      brief_date: {
        gte: yesterday,
        lt: new Date(yesterday.getTime() + 24 * 60 * 60 * 1000),
      },
    },
    include: {
      daily_brief_items: {
        include: {
          article: {
            select: {
              article_annotations: {
                select: {
                  topics_json: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const topics = new Set<string>();
  if (!brief) return topics;

  for (const item of brief.daily_brief_items) {
    const annot = item.article?.article_annotations;
    if (annot?.topics_json) {
      try {
        const parsed = JSON.parse(annot.topics_json) as string[];
        if (Array.isArray(parsed)) {
          for (const t of parsed) {
            if (typeof t === "string") topics.add(t);
          }
        }
      } catch {
        // Ignore parse errors
      }
    }
  }

  return topics;
}

/**
 * Compute novelty bonus: +0.15 for topics with positive feedback
 * that were NOT in yesterday's brief.
 */
export function computeNoveltyBonus(
  candidate: { topics: string[] },
  positiveTopics: Set<string>,
  yesterdayBriefTopics: Set<string>
): number {
  for (const topic of candidate.topics) {
    if (positiveTopics.has(topic) && !yesterdayBriefTopics.has(topic)) {
      return 0.15;
    }
  }
  return 0.0;
}

/**
 * Score candidate articles using the ranking formula.
 * score = 0.35 * topic_match + 0.20 * entity_match + 0.20 * recency + 0.15 * source_quality + 0.10 * diversity_adjustment
 *
 * Phase 1 diversity rules:
 * - If source already has 2 items in running top 10, apply -0.15 to additional candidates
 * - If candidate shares dedupe_key or cluster_id with already-selected item, apply -0.30 penalty
 */
export function scoreCandidates(
  candidates: Array<{
    article_id: number;
    title: string;
    source_name: string;
    published_at: Date | null;
    topics: string[];
    entities: string[];
    quality_score: number;
    dedupe_key: string;
    cluster_id: string | null;
    cached_summary: string | null;
    cached_tldr: string | null;
  }>,
  topicWeights: Map<string, number>,
  entityWeights: Map<string, number>,
  now: Date = new Date(),
  yesterdayBriefTopics: Set<string> = new Set()
): ScoredCandidate[] {
  const maxTopicWeight = Math.max(1, ...Array.from(topicWeights.values()));
  const maxEntityWeight = Math.max(1, ...Array.from(entityWeights.values()));

  // Identify topics with positive feedback for novelty bonus
  const positiveTopics = new Set<string>();
  topicWeights.forEach((weight, topic) => {
    if (weight > 0) {
      positiveTopics.add(topic);
    }
  });

  // Calculate raw scores
  const scored = candidates.map((c) => {
    // Topic match: sum of weights for matched topics, normalized to 0-1
    const topicScore =
      c.topics.length > 0
        ? Math.min(
            1,
            c.topics.reduce((sum, t) => {
              const w = topicWeights.get(t) ?? 0;
              return sum + w;
            }, 0) / maxTopicWeight
          )
        : 0;

    // Entity match: sum of weights for matched entities, normalized to 0-1
    const entityScore =
      c.entities.length > 0
        ? Math.min(
            1,
            c.entities.reduce((sum, e) => {
              const w = entityWeights.get(e) ?? 0;
              return sum + w;
            }, 0) / maxEntityWeight
          )
        : 0;

    // Recency: exponential decay based on hours since publication (0-1)
    const hoursOld = c.published_at
      ? Math.max(
          0,
          (now.getTime() - c.published_at.getTime()) / (1000 * 60 * 60)
        )
      : 24;
    const recencyScore = Math.exp(-hoursOld / 48);

    // Source quality: normalize quality_score 1-5 to 0-1
    const sourceQualityScore = (c.quality_score - 1) / 4;

    // Novelty bonus
    const noveltyBonus = computeNoveltyBonus(c, positiveTopics, yesterdayBriefTopics);

    return {
      ...c,
      topicScore,
      entityScore,
      recencyScore,
      sourceQualityScore,
      noveltyBonus,
    };
  });

  // Phase 1 diversity tracking
  const selectedSourceCounts = new Map<string, number>();
  const selectedDedupeKeys = new Set<string>();
  const selectedClusterIds = new Set<string>();

  // Sort by raw topic score first for diversity calculation
  scored.sort((a, b) => b.topicScore - a.topicScore);

  const final = scored.map((s) => {
    // Source diversity penalty: if source already has 2 items in top 10
    const sourceCount = selectedSourceCounts.get(s.source_name) ?? 0;
    const sourceDiversityPenalty = sourceCount >= 2 ? -0.15 : 0;

    // Dedupe/cluster penalty: -0.30 if shares dedupe_key or cluster_id
    const dedupePenalty =
      selectedDedupeKeys.has(s.dedupe_key) ? -0.30 : 0;
    const clusterPenalty =
      s.cluster_id && selectedClusterIds.has(s.cluster_id) ? -0.30 : 0;
    const dedupeClusterPenalty = dedupePenalty + clusterPenalty;

    const diversityPenalty = sourceDiversityPenalty + dedupeClusterPenalty;
    const diversityScore = Math.max(0, Math.min(1, 0.5 + diversityPenalty));

    // Track selections
    if (sourceDiversityPenalty === 0) {
      selectedSourceCounts.set(s.source_name, sourceCount + 1);
    }
    selectedDedupeKeys.add(s.dedupe_key);
    if (s.cluster_id) {
      selectedClusterIds.add(s.cluster_id);
    }

    // Combined score with weights
    const score =
      0.35 * s.topicScore +
      0.20 * s.entityScore +
      0.20 * s.recencyScore +
      0.15 * s.sourceQualityScore +
      0.10 * diversityScore +
      s.noveltyBonus;

    return {
      article_id: s.article_id,
      title: s.title,
      source_name: s.source_name,
      published_at: s.published_at,
      topics: s.topics,
      entities: s.entities,
      quality_score: s.quality_score,
      dedupe_key: s.dedupe_key,
      cluster_id: s.cluster_id,
      cached_summary: s.cached_summary,
      cached_tldr: s.cached_tldr,
      score: Math.round(score * 1000) / 1000,
    };
  });

  return final.sort((a, b) => b.score - a.score);
}

/**
 * Filter candidates by source quality floor.
 * Uses isFeatureEnabled('enable_source_policy') to gate this check.
 * Default: enabled=true, quality_floor=2 if no policy exists.
 */
export async function filterBySourcePolicy(
  candidates: Array<{
    article_id: number;
    title: string;
    source_name: string;
    canonical_url: string;
    published_at: Date | null;
    topics: string[];
    entities: string[];
    quality_score: number;
    dedupe_key: string;
    cluster_id: string | null;
    cached_summary: string | null;
    cached_tldr: string | null;
    provider: string;
    license_class: string | null;
    is_fixture: boolean;
  }>
): Promise<typeof candidates> {
  const sourcePolicyEnabled = await isFeatureEnabled("enable_source_policy");
  if (!sourcePolicyEnabled) {
    return candidates;
  }

  // Fetch source policies for all candidate sources
  const sourceNames = Array.from(new Set(candidates.map((c) => c.source_name)));
  const policies = await db.source_policies.findMany({
    where: {
      source_name: {
        in: sourceNames,
      },
    },
  });

  const policyMap = new Map<string, { enabled: boolean; quality_floor: number }>();
  for (const p of policies) {
    policyMap.set(p.source_name, {
      enabled: p.enabled,
      quality_floor: p.quality_floor,
    });
  }

  return candidates.filter((c) => {
    const policy = policyMap.get(c.source_name);
    const enabled = policy?.enabled ?? true;
    const qualityFloor = policy?.quality_floor ?? 2;
    return enabled && c.quality_score >= qualityFloor;
  });
}

/**
 * Get annotated articles for brief candidates.
 * Requires articles to have annotations.
 */
export async function getCandidates(
  since: Date,
  limit = 50
): Promise<
  Array<{
    article_id: number;
    title: string;
    source_name: string;
    canonical_url: string;
    published_at: Date | null;
    topics: string[];
    entities: string[];
    quality_score: number;
    dedupe_key: string;
    cluster_id: string | null;
    cached_summary: string | null;
    cached_tldr: string | null;
    provider: string;
    license_class: string | null;
    is_fixture: boolean;
  }>
> {
  const poolSize = Math.max(limit * 20, 200);
  const annotated: CandidateAnnotationRow[] = await db.article_annotations.findMany({
    where: {
      article: {
        published_at: { gte: since },
        blocked_reason: null,
        provider: { not: "seed" },
      },
    },
    include: {
      article: {
        select: {
          id: true,
          title: true,
          source_name: true,
          canonical_url: true,
          published_at: true,
          cluster_id: true,
          provider: true,
          license_class: true,
          is_fixture: true,
        },
      },
    },
    take: poolSize,
  });

  const candidates = annotated.map((a) => ({
    article_id: a.article.id,
    title: sanitizeFeedTitle(a.article.title) ?? (a.article.title.trim() || "Untitled"),
    source_name: a.article.source_name,
    canonical_url: a.article.canonical_url,
    published_at: a.article.published_at,
    topics: a.topics_json ? JSON.parse(a.topics_json) : [],
    entities: a.entities_json ? JSON.parse(a.entities_json) : [],
    quality_score: a.quality_score ?? 3,
    dedupe_key: a.dedupe_key ?? "",
    cluster_id: a.article.cluster_id,
    cached_summary: a.summary ?? null,
    cached_tldr: a.tldr ?? null,
    provider: a.article.provider,
    license_class: a.article.license_class,
    is_fixture: a.article.is_fixture,
  }));

  return candidates
    .filter((candidate) => !isFixtureArticle(candidate))
    .sort((a, b) => {
      const aTime = a.published_at?.getTime() ?? 0;
      const bTime = b.published_at?.getTime() ?? 0;
      if (aTime !== bTime) return bTime - aTime;
      return b.article_id - a.article_id;
    })
    .slice(0, limit);
}

/**
 * Generate summary and why_recommended for a brief item using OpenAI.
 * Input: title, source, snippet, matched topics, matched entities
 * Output: summary (2-3 sentences, under 80 words), why_recommended (1 sentence, under 20 words)
 */
export async function generateBriefItem(
  input: BriefItemInput
): Promise<GeneratedBriefItem> {
  const prompt = `You are writing brief items for a personalized daily AI news digest.

Article:
- Title: ${input.article_title}
- Source: ${input.article_source}
- Snippet: ${input.article_snippet ?? "(no snippet)"}

Generate three fields:
1. tldr: A single, punchy sentence summarizing the core takeaway (under 20 words).
2. summary: A 2-3 sentence expanded summary (under 80 words).
3. why_recommended: A single sentence explaining why this article was selected (under 20 words).

Return ONLY valid JSON matching this schema (no markdown, no extra text):
{
  "tldr": "...",
  "summary": "...",
  "why_recommended": "..."
}`;

  const response = await getSummaryClient().chat.completions.create({
    model: SUMMARY_MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.5,
    max_tokens: 300,
    // Open-source models (OpenRouter) do not support json_object format
  });

  let content = response.choices[0]?.message.content;
  if (!content) {
    throw new Error("OpenAI summary generation returned empty response");
  }

  // Strip markdown code blocks that open-source models wrap their JSON in
  content = content.replace(/```json/gi, "").replace(/```/g, "").trim();

  const parsed = JSON.parse(content) as Partial<GeneratedBriefItem>;

  let tldr = (parsed.tldr ?? "").trim();
  let summary = (parsed.summary ?? "").trim();
  let why_recommended = (parsed.why_recommended ?? "").trim();

  // Enforce word limits
  const tldrWords = tldr.split(/\s+/).filter(Boolean);
  if (tldrWords.length > 20) {
    tldr = tldrWords.slice(0, 20).join(" ") + ".";
  }
  const summaryWords = summary.split(/\s+/).filter(Boolean);
  if (summaryWords.length > 80) {
    summary = summaryWords.slice(0, 80).join(" ") + ".";
  }
  const reasonWords = why_recommended.split(/\s+/).filter(Boolean);
  if (reasonWords.length > 20) {
    why_recommended = reasonWords.slice(0, 20).join(" ") + ".";
  }

  return { tldr, summary, why_recommended };
}

/**
 * Generate a full daily brief for a user.
 * Creates or updates the daily_briefs record with top 5 scored items.
 * Cache: if a brief already exists for today with status='completed', return immediately.
 */
export async function generateDailyBriefForUser(
  userId: string
): Promise<{
  brief_id: number;
  items: number;
  duration_ms: number;
}> {
  const startTime = Date.now();

  // Determine the user's brief date (local timezone)
  const userRecord = await db.users.findUnique({
    where: { id: userId },
    select: { timezone: true },
  });
  const timeZone = userRecord?.timezone ?? "America/Los_Angeles";

  const now = new Date();
  const localDateStr = now.toLocaleDateString("en-CA", { timeZone });
  const briefDate = new Date(localDateStr);

  // --- Cache check: if brief already exists for today and is completed, return immediately ---
  const existingBrief = await db.daily_briefs.findUnique({
    where: {
      user_id_brief_date: {
        user_id: userId,
        brief_date: briefDate,
      },
    },
  });

  if (existingBrief && existingBrief.status === "completed") {
    return {
      brief_id: existingBrief.id,
      items: existingBrief.candidate_count ?? 0,
      duration_ms: Date.now() - startTime,
    };
  }

  // Create or update brief record
  const brief = await db.daily_briefs.upsert({
    where: {
      user_id_brief_date: {
        user_id: userId,
        brief_date: briefDate,
      },
    },
    create: {
      user_id: userId,
      brief_date: briefDate,
      status: "generating",
      version_tag: "v0.1",
    },
    update: {
      status: "generating",
    },
  });

  try {
    // Phase 1: starting — already done at create/upsert above
    await updateBriefProgress(userId, briefDate, {
      phase: "starting",
      message: PHASE_MESSAGES.starting,
      step: 1,
      totalSteps: 6,
      itemsCompleted: 0,
      itemsTotal: 0,
      updatedAt: new Date().toISOString(),
    });

    // Phase 2: building_profile
    const profile = await buildUserProfile(userId);
    await updateBriefProgress(userId, briefDate, {
      phase: "building_profile",
      message: PHASE_MESSAGES.building_profile,
      step: 2,
      totalSteps: 6,
      itemsCompleted: 0,
      itemsTotal: 0,
      updatedAt: new Date().toISOString(),
    });

    // Fetch yesterday's brief topics for novelty bonus
    const yesterdayBriefTopics = await getYesterdayBriefTopics(userId);

    // Get candidates from last 24 hours
    const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    let candidates = await getCandidates(since, 50);

    // No annotated articles available — run a mini ingestion + annotation pipeline
    if (candidates.length === 0) {
      await bootstrapLiveArticlesForNewUser();
      candidates = await getCandidates(since, 50);
    }

    // Phase 3: loading_candidates (done after candidates are available)
    await updateBriefProgress(userId, briefDate, {
      phase: "loading_candidates",
      message: PHASE_MESSAGES.loading_candidates,
      step: 3,
      totalSteps: 6,
      itemsCompleted: 0,
      itemsTotal: 0,
      updatedAt: new Date().toISOString(),
    });

    if (candidates.length === 0) {
      const error = new Error("No eligible live articles available for brief generation");
      logError("brief-generation-empty-candidate-set", error, { userId });
      throw error;
    }

    // Apply source quality floor filtering (gated by feature flag)
    candidates = await filterBySourcePolicy(candidates);

    // Phase 4: ranking_candidates
    await updateBriefProgress(userId, briefDate, {
      phase: "ranking_candidates",
      message: PHASE_MESSAGES.ranking_candidates,
      step: 4,
      totalSteps: 6,
      itemsCompleted: 0,
      itemsTotal: 0,
      updatedAt: new Date().toISOString(),
    });

    // Score and rank (with novelty bonus and diversity penalty)
    const scored = scoreCandidates(
      candidates,
      profile.topicWeights,
      profile.entityWeights,
      now,
      yesterdayBriefTopics
    );

    // Dedupe by keeping only the first occurrence of each dedupe_key
    const deduped: ScoredCandidate[] = [];
    const seenKeys = new Set<string>();
    for (const c of scored) {
      if (!seenKeys.has(c.dedupe_key)) {
        deduped.push(c);
        seenKeys.add(c.dedupe_key);
      }
      if (deduped.length >= 5) break;
    }

    // Top 5
    const top5 = deduped.slice(0, 5);

    // Phase 5: writing_summaries — initial
    await updateBriefProgress(userId, briefDate, {
      phase: "writing_summaries",
      message: PHASE_MESSAGES.writing_summaries,
      step: 5,
      totalSteps: 6,
      itemsCompleted: 0,
      itemsTotal: top5.length,
      updatedAt: new Date().toISOString(),
    });

    // Generate summaries for top items
    const briefItemsResult: Array<{
      article_id: number;
      rank: number;
      score: number;
      summary: string;
      tldr: string;
      why_recommended: string;
      provenance_json: string | null;
    }> = [];

    for (let i = 0; i < top5.length; i++) {
      const candidate = top5[i];
      try {
        const matchedTopics = candidate.topics.filter((t) =>
          profile.topicWeights.has(t)
        );
        const matchedEntities = candidate.entities.filter((e) =>
          profile.entityWeights.has(e)
        );
        const provenance = buildBriefItemProvenance({
          matchedTopics,
          matchedEntities,
          safariTopicWeights: profile.safariHistoryImport.topicWeights,
          safariTopicDomainWeights: profile.safariHistoryImport.topicDomainWeights,
        });

        let summary = candidate.cached_summary;
        let tldr = candidate.cached_tldr;
        let why_recommended = "";

        // If we don't have a cached summary, call OpenRouter and save it globally
        if (!summary || !tldr) {
          const article = await db.articles.findUnique({
            where: { id: candidate.article_id },
            select: { snippet: true },
          });
          const generated = await generateBriefItem({
            article_title: candidate.title,
            article_source: candidate.source_name,
            article_snippet: sanitizeFeedSnippet(article?.snippet ?? null),
            matched_topics: matchedTopics,
            matched_entities: matchedEntities,
          });

          summary = generated.summary;
          tldr = generated.tldr;
          why_recommended = generated.why_recommended;

          // Save to global cache for the next user
          await db.article_annotations.update({
            where: { article_id: candidate.article_id },
            data: { summary, tldr },
          });
        } else {
          // Cache hit: skip AI and generate a quick recommendation reason
          if (matchedTopics.length > 0) {
            why_recommended = `Selected for you based on your interest in ${matchedTopics[0].replace(/_/g, " ")}.`;
          } else if (matchedEntities.length > 0) {
            why_recommended = `Included because you follow updates regarding ${matchedEntities[0].replace(/_/g, " ")}.`;
          } else {
            why_recommended = "Selected based on your recent reading habits.";
          }
        }

        briefItemsResult.push({
          article_id: candidate.article_id,
          rank: i + 1,
          score: candidate.score,
          summary: summary!,
          tldr: tldr!,
          why_recommended,
          provenance_json: JSON.stringify(provenance),
        });
      } catch (err) {
        // Log the exact error and STOP the entire generation process
        logError("brief-item-generation", err, {
          articleId: candidate.article_id,
          title: candidate.title,
          source: candidate.source_name,
        });
        console.error("OPENROUTER GENERATION ERROR:", err);

        const errorDetail = err instanceof Error ? err.message : "Unknown AI error";
        throw new Error(`AI Summary failed for "${candidate.title}": ${errorDetail}`);
      }

      // Update sub-progress during summary writing
      await updateBriefProgress(userId, briefDate, {
        phase: "writing_summaries",
        message: PHASE_MESSAGES.writing_summaries,
        step: 5,
        totalSteps: 6,
        itemsCompleted: i + 1,
        itemsTotal: top5.length,
        updatedAt: new Date().toISOString(),
      });
    }

    // Phase 6: finalizing
    await updateBriefProgress(userId, briefDate, {
      phase: "finalizing",
      message: PHASE_MESSAGES.finalizing,
      step: 6,
      totalSteps: 6,
      itemsCompleted: 0,
      itemsTotal: 0,
      updatedAt: new Date().toISOString(),
    });

    // Update brief with items
    await db.$transaction(async (tx: Prisma.TransactionClient) => {
      // Delete existing items
      await tx.daily_brief_items.deleteMany({
        where: { daily_brief_id: brief.id },
      });

      // Create new items
      if (briefItemsResult.length > 0) {
        await tx.daily_brief_items.createMany({
          data: briefItemsResult.map((item) => ({
            daily_brief_id: brief.id,
            article_id: item.article_id,
            rank: item.rank,
            score: item.score,
            summary: item.summary,
            tldr: item.tldr,
            why_recommended: item.why_recommended,
            provenance_json: item.provenance_json,
          })),
        });
      }

      // Update brief status
      await tx.daily_briefs.update({
        where: { id: brief.id },
        data: {
          status: "completed",
          generated_at: new Date(),
          generation_duration_ms: Date.now() - startTime,
          candidate_count: candidates.length,
          progress_json: null,
        },
      });
    });

    // Update user_profiles last_active_at
    await db.user_profiles.update({
      where: { user_id: userId },
      data: { last_active_at: new Date() },
    });

    return {
      brief_id: brief.id,
      items: briefItemsResult.length,
      duration_ms: Date.now() - startTime,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Brief generation failed. Try again.";

    await db.daily_briefs.update({
      where: { id: brief.id },
      data: {
        status: "failed",
        generated_at: new Date(),
        generation_duration_ms: Date.now() - startTime,
        version_tag: "v0.1-error",
        progress_json: JSON.stringify({
          phase: "failed",
          message: errorMessage,
          step: 0,
          totalSteps: 6,
          itemsCompleted: 0,
          itemsTotal: 0,
          updatedAt: new Date().toISOString(),
        }),
      },
    });
    logError("brief-generation", err, { briefId: brief.id, userId });

    throw err;
  }
}

/**
 * Fetch articles from RSS feeds, dedupe, insert, and classify them with AI
 * so they become candidates for brief generation. Only fetches what is
 * needed: 50 articles max from RSS feeds (skipping TheNewsAPI since it
 * requires a separate API key).
 */
async function bootstrapLiveArticlesForNewUser(): Promise<number> {
  const rawArticles = await fetchAllRSSFeeds();
  if (rawArticles.length === 0) {
    logError(
      "bootstrap-live-articles",
      new Error("No articles returned from RSS feeds"),
      { phase: "fetch" }
    );
    return 0;
  }

  // Limit to 50 fresh articles
  const batch: RawArticle[] = rawArticles.slice(0, 50);

  // Insert articles
  const existingUrls = await db.articles.findMany({
    where: { canonical_url: { in: batch.map((a) => a.canonical_url) } },
    select: { canonical_url: true },
  }) as ExistingArticleUrlRow[];
  const existingUrlSet = new Set(existingUrls.map((e) => e.canonical_url));
  const newArticles: RawArticle[] = batch.filter((a) => !existingUrlSet.has(a.canonical_url));

  for (const a of newArticles) {
    try {
      const inserted = await db.articles.create({
        data: {
          title: sanitizeFeedTitle(a.title) ?? (a.title.trim() || "Untitled"),
          snippet: sanitizeFeedSnippet(a.snippet),
          canonical_url: a.canonical_url,
          source_name: a.source,
          published_at: a.published_at,
          language: a.language ?? "en",
          provider: a.provider,
          is_fixture: false,
          license_class: a.license_class ?? null,
          image_url:
            normalizePublicImageUrl(a.image_url ?? "", a.canonical_url) ?? null,
        },
      });

      // Annotate the article with AI classification
      try {
        const classification = await classifyArticle({
          title: inserted.title,
          source: inserted.source_name,
          snippet: inserted.snippet,
        });

        await db.article_annotations.create({
          data: {
            article_id: inserted.id,
            topics_json: JSON.stringify(classification.topics),
            entities_json: JSON.stringify(classification.entities),
            quality_score: classification.quality_score,
            dedupe_key: classification.dedupe_key,
          },
        });
      } catch {
        logError("bootstrap-live-article-classification", new Error("Failed to classify article, using defaults"), {
          articleId: inserted.id,
          source: inserted.source_name,
        });
        // Default annotation so the article is still a candidate
        await db.article_annotations.create({
          data: {
            article_id: inserted.id,
            topics_json: JSON.stringify([]),
            entities_json: JSON.stringify([]),
            quality_score: 3,
            dedupe_key: `manual_${inserted.id}`,
          },
        });
      }
    } catch {
      // Dedupe miss or insert conflict, skip
    }
  }

  console.log(`seedArticles: inserted ${newArticles.length} articles, total RSS hits ${rawArticles.length}`);
  return newArticles.length;
}
