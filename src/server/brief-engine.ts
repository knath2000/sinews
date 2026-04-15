import OpenAI from "openai";
import { db } from "./db/client";
import { SIGNAL_WEIGHTS, TOPIC_TAXONOMY } from "./taxonomy";

const SUMMARY_MODEL =
  process.env.OPENAI_SUMMARY_MODEL || "gpt-4o-mini";

let _summaryClient: OpenAI | undefined;
function getSummaryClient(): OpenAI {
  if (!_summaryClient) {
    _summaryClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
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
  why_recommended: string;
}

/**
 * Calculate user interest signals weights for topics and entities.
 * Builds a weighted profile from interest_signals and user_topic_preferences.
 */
export async function buildUserProfile(userId: string): Promise<{
  topicWeights: Map<string, number>;
  entityWeights: Map<string, number>;
}> {
  const topicWeights = new Map<string, number>();
  const entityWeights = new Map<string, number>();

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
    where: { user_id: userId },
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

  return { topicWeights, entityWeights };
}

/**
 * Score candidate articles using the ranking formula.
 * score = 0.35 * topic_match + 0.20 * entity_match + 0.20 * recency + 0.15 * source_quality + 0.10 * diversity_adjustment
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
  }>,
  topicWeights: Map<string, number>,
  entityWeights: Map<string, number>,
  now: Date = new Date()
): ScoredCandidate[] {
  const maxTopicWeight = Math.max(1, ...Array.from(topicWeights.values()));
  const maxEntityWeight = Math.max(1, ...Array.from(entityWeights.values()));

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

    return {
      ...c,
      topicScore,
      entityScore,
      recencyScore,
      sourceQualityScore,
    };
  });

  // Calculate diversity adjustment
  // Penalize articles that share dedupe_key with higher-ranked candidates
  const usedDedupeKeys = new Set<string>();
  const usedSources = new Set<string>();

  // Sort by raw score first for diversity calculation
  scored.sort((a, b) => b.topicScore - a.topicScore);

  const final = scored.map((s) => {
    const diversityPenalty = usedDedupeKeys.has(s.dedupe_key)
      ? -0.5
      : 0;
    const sourceBonus = usedSources.has(s.source_name) ? -0.1 : 0.05;
    const diversityScore = Math.max(0, Math.min(1, 0.5 + diversityPenalty + sourceBonus));

    if (diversityPenalty === 0) {
      usedDedupeKeys.add(s.dedupe_key);
      usedSources.add(s.source_name);
    }

    // Combined score with weights
    const score =
      0.35 * s.topicScore +
      0.20 * s.entityScore +
      0.20 * s.recencyScore +
      0.15 * s.sourceQualityScore +
      0.10 * diversityScore;

    return {
      article_id: s.article_id,
      title: s.title,
      source_name: s.source_name,
      published_at: s.published_at,
      topics: s.topics,
      entities: s.entities,
      quality_score: s.quality_score,
      dedupe_key: s.dedupe_key,
      score: Math.round(score * 1000) / 1000,
    };
  });

  return final.sort((a, b) => b.score - a.score);
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
    published_at: Date | null;
    topics: string[];
    entities: string[];
    quality_score: number;
    dedupe_key: string;
  }>
> {
  const annotated = await db.article_annotations.findMany({
    where: {
      article: {
        published_at: { gte: since },
        blocked_reason: null,
      },
    },
    include: {
      article: {
        select: {
          id: true,
          title: true,
          source_name: true,
          published_at: true,
        },
      },
    },
    take: limit,
  });

  return annotated.map((a) => ({
    article_id: a.article.id,
    title: a.article.title,
    source_name: a.article.source_name,
    published_at: a.article.published_at,
    topics: a.topics_json ? JSON.parse(a.topics_json) : [],
    entities: a.entities_json ? JSON.parse(a.entities_json) : [],
    quality_score: a.quality_score ?? 3,
    dedupe_key: a.dedupe_key ?? "",
  }));
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

User context:
- Matched topics: ${input.matched_topics.length > 0 ? input.matched_topics.join(", ") : "none"}
- Matched entities: ${input.matched_entities.length > 0 ? input.matched_entities.join(", ") : "none"}

Generate two fields:
1. summary: A 2-3 sentence summary of the article. Must be under 80 words total. Focus on what happened and why it matters.
2. why_recommended: A single sentence explaining why this article was selected for this user. Must be under 20 words. Reference their interests if possible.

Return ONLY valid JSON matching this schema (no markdown, no extra text):
{
  "summary": "2-3 sentence summary under 80 words",
  "why_recommended": "1 sentence reason under 20 words"
}`;

  const response = await getSummaryClient().chat.completions.create({
    model: SUMMARY_MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.5,
    max_tokens: 200,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message.content;
  if (!content) {
    throw new Error("OpenAI summary generation returned empty response");
  }

  const parsed = JSON.parse(content) as Partial<GeneratedBriefItem>;

  let summary = (parsed.summary ?? "").trim();
  let why_recommended = (parsed.why_recommended ?? "").trim();

  // Enforce word limits
  const summaryWords = summary.split(/\s+/).filter(Boolean);
  if (summaryWords.length > 80) {
    summary = summaryWords.slice(0, 80).join(" ") + ".";
  }
  const reasonWords = why_recommended.split(/\s+/).filter(Boolean);
  if (reasonWords.length > 20) {
    why_recommended = reasonWords.slice(0, 20).join(" ") + ".";
  }

  return { summary, why_recommended };
}

/**
 * Generate a full daily brief for a user.
 * Creates or updates the daily_briefs record with top 5 scored items.
 */
export async function generateDailyBriefForUser(userId: string): Promise<{
  brief_id: number;
  items: number;
  duration_ms: number;
}> {
  const startTime = Date.now();

  // Determine the user's brief date (local timezone)
  const timeZone =
    (
      await db.users.findUnique({
        where: { id: userId },
        select: { timezone: true },
      })
    )?.timezone ?? "America/Los_Angeles";

  const now = new Date();
  const localDateStr = now.toLocaleDateString("en-CA", { timeZone });
  const briefDate = new Date(localDateStr);

  // Check if brief already exists for today
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
    // Build user profile
    const profile = await buildUserProfile(userId);

    // Get candidates from last 48 hours
    const since = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const candidates = await getCandidates(since, 50);

    // Score and rank
    const scored = scoreCandidates(
      candidates,
      profile.topicWeights,
      profile.entityWeights,
      now
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

    // Generate summaries for top items
    const briefItemsResult: Array<{
      article_id: number;
      rank: number;
      score: number;
      summary: string;
      why_recommended: string;
    }> = [];

    for (let i = 0; i < top5.length; i++) {
      const candidate = top5[i];
      try {
        // Fetch the article snippet
        const article = await db.articles.findUnique({
          where: { id: candidate.article_id },
          select: { snippet: true },
        });

        const matchedTopics = candidate.topics.filter((t) =>
          profile.topicWeights.has(t)
        );
        const matchedEntities = candidate.entities.filter((e) =>
          profile.entityWeights.has(e)
        );

        const generated = await generateBriefItem({
          article_title: candidate.title,
          article_source: candidate.source_name,
          article_snippet: article?.snippet ?? null,
          matched_topics: matchedTopics,
          matched_entities: matchedEntities,
        });

        briefItemsResult.push({
          article_id: candidate.article_id,
          rank: i + 1,
          score: candidate.score,
          summary: generated.summary,
          why_recommended: generated.why_recommended,
        });
      } catch (err) {
        // Fallback: use raw data without generated summary
        console.error(
          `Failed to generate summary for article ${candidate.article_id}:`,
          err
        );
        briefItemsResult.push({
          article_id: candidate.article_id,
          rank: i + 1,
          score: candidate.score,
          summary: candidate.title,
          why_recommended: `Relevant to your interests`,
        });
      }
    }

    // Update brief with items
    await db.$transaction(async (tx) => {
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
            why_recommended: item.why_recommended,
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
        },
      });
    });

    return {
      brief_id: brief.id,
      items: briefItemsResult.length,
      duration_ms: Date.now() - startTime,
    };
  } catch (err) {
    // Mark brief as failed
    await db.daily_briefs.update({
      where: { id: brief.id },
      data: {
        status: "failed",
        generated_at: new Date(),
        generation_duration_ms: Date.now() - startTime,
        version_tag: "v0.1-error",
      },
    });
    console.error(`Brief generation failed for brief ${brief.id}:`, err);

    throw err;
  }
}
