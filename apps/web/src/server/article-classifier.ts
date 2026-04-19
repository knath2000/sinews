import { OpenAI } from "openai";
import { db } from "./db/client";
import { TOPIC_TAXONOMY, TopicTaxonomy } from "./taxonomy";
import { logError } from "./error-logger";

let client: OpenAI | null = null;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function getClient(): OpenAI {
  if (!client) {
    const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;
    const isRouter = !!process.env.OPENROUTER_API_KEY;

    client = new OpenAI({
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
  return client;
}

const CLASSIFIER_MODEL =
  process.env.OPENAI_CLASSIFIER_MODEL || "gpt-4o-mini";

export interface ArticleAnnotation {
  topics: TopicTaxonomy[];
  entities: string[];
  quality_score: number;
  dedupe_key: string;
}

export interface AnnotationWithArticleId extends ArticleAnnotation {
  article_id: number;
}

/**
 * Classifies an article using OpenAI/OpenRouter.
 * Input: title, source, snippet
 * Output: topics (up to 3 from taxonomy), entities (up to 8), quality_score (1-5), dedupe_key
 */
export async function classifyArticle(input: {
  title: string;
  source: string;
  snippet?: string | null;
}): Promise<ArticleAnnotation> {
  const prompt = `You are an article classifier for an AI news digest. Analyze the following article and return a JSON object with the specified fields.

Article:
- Title: ${input.title}
- Source: ${input.source}
- Snippet: ${input.snippet ?? "(no snippet)"}

Instructions:
1. topics: Select up to 3 topics from this exact list (use the keys, lowercase with underscores):
   ${TOPIC_TAXONOMY.join(", ")}
   Only include topics that are clearly relevant. Return an empty array if none apply.

2. entities: Extract up to 8 proper nouns or key entities from the article (company names, product names, people, institutions, technologies). Return as an array of strings.

3. quality_score: Rate 1-5 based on:
   - 5: Major news source, in-depth analysis, highly credible
   - 4: Reputable source, clear reporting
   - 3: Average source, factual reporting
   - 2: Low-quality source, clickbait, or thin content
   - 1: Spam, clearly unreliable, or non-news

4. dedupe_key: A short normalized string (lowercase, alphanumeric + hyphens) that captures the core subject. Use format: "main-topic-key-concept". This should be unique enough to identify this story but general enough that duplicate coverage of the same event gets the same key. Keep it under 5 words.

Return ONLY valid JSON matching this schema (no markdown, no extra text):
{
  "topics": ["topic1", "topic2"],
  "entities": ["entity1", "entity2"],
  "quality_score": 4,
  "dedupe_key": "normalized-key"
}`;

  const oc = getClient();
  const shortTitle = input.title.substring(0, 40);
  console.log(`[LLM-GATEWAY] Sending "${shortTitle}..." to OpenRouter (${CLASSIFIER_MODEL})`);
  const startTime = Date.now();

  let response;
  try {
    response = await oc.chat.completions.create({
      model: CLASSIFIER_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      max_tokens: 300,
      response_format: { type: "json_object" },
    });
  } catch (networkError) {
    console.error(`[LLM-NETWORK] OpenRouter rejected request for "${shortTitle}":`, networkError);
    throw networkError;
  }

  let raw = response.choices[0]?.message.content;
  if (!raw) {
    console.error(`[LLM-EMPTY] Returned empty response for "${shortTitle}"`);
    throw new Error("Classifier returned empty response");
  }

  const elapsed = Date.now() - startTime;
  console.log(`[LLM-SUCCESS] Response in ${elapsed}ms for "${shortTitle}"`);

  // Strip markdown fences from open-source models
  raw = raw.replace(/```json/gi, "").replace(/```/g, "").trim();

  let parsed: Partial<ArticleAnnotation>;
  try {
    parsed = JSON.parse(raw);
  } catch (parseError) {
    console.error(`[LLM-PARSE] Failed to parse JSON for "${shortTitle}"`);
    console.error(`[LLM-RAW-OUTPUT]:\n${raw}`);
    throw new Error("Invalid JSON from classifier");
  }

  // Validate and sanitize
  const topics = (parsed.topics ?? []).filter((t): t is TopicTaxonomy =>
    (TOPIC_TAXONOMY as readonly string[]).includes(t)
  );
  const entities = (parsed.entities ?? [])
    .filter((e) => typeof e === "string" && e.trim().length > 0)
    .map((e) => e.trim())
    .slice(0, 8);

  let quality_score = parsed.quality_score ?? 3;
  if (!Number.isInteger(quality_score) || quality_score < 1 || quality_score > 5) {
    quality_score = 3;
  }

  const dedupe_key = (parsed.dedupe_key ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 64)
    .replace(/^-|-$/g, "");

  return { topics, entities, quality_score, dedupe_key };
}

/**
 * Batch classify articles that don't have annotations yet.
 */
export async function classifyUnannotatedArticles(): Promise<number> {
  console.log("[BATCH] Scanning for unannotated articles...");

  const articlesWithoutAnnotations = await db.articles.findMany({
    where: {
      article_annotations: {
        is: null,
      },
      OR: [
        { blocked_reason: null },
        { blocked_reason: "" },
      ],
    },
    select: {
      id: true,
      title: true,
      source_name: true,
      snippet: true,
    },
    take: 10,
    orderBy: {
      created_at: "desc",
    },
  });

  console.log(`[BATCH] Query returned ${articlesWithoutAnnotations.length} articles.`);

  if (articlesWithoutAnnotations.length === 0) {
    // If we still get 0, log a sample article to see why it fails the filter
    const sample = await db.articles.findFirst({
      include: { article_annotations: true },
    });
    console.log("[BATCH] Filter Debug - Sample Article:", JSON.stringify({
      id: sample?.id,
      has_annotation_record: !!sample?.article_annotations,
      blocked_reason: sample?.blocked_reason,
    }));
    return 0;
  }

  const total = articlesWithoutAnnotations.length;
  console.log(`[BATCH] Processing ${total} articles with a 2s delay between each...`);

  let annotated = 0;
  for (let i = 0; i < total; i++) {
    // Pause to avoid triggering OpenRouter rate limits
    if (i > 0) {
      console.log("[BATCH] Throttling: Waiting 2000ms before next item...");
      await sleep(2000);
    }

    const article = articlesWithoutAnnotations[i];
    console.log(`[BATCH ${i + 1}/${total}] ID: ${article.id}`);

    try {
      const annotation = await classifyArticle({
        title: article.title,
        source: article.source_name,
        snippet: article.snippet,
      });

      await db.article_annotations.create({
        data: {
          article_id: article.id,
          topics_json: JSON.stringify(annotation.topics),
          entities_json: JSON.stringify(annotation.entities),
          quality_score: annotation.quality_score,
          dedupe_key: annotation.dedupe_key,
        },
      });

      console.log(`[BATCH-SAVE] Saved annotations for ID: ${article.id}`);
      annotated++;
    } catch (err) {
      console.error(`[BATCH-ERROR] Skipping ID ${article.id}`, err);
      logError("article-classification", err, {
        articleId: article.id,
        title: article.title,
        source: article.source_name,
      });
    }
  }

  console.log(`[BATCH-DONE] Annotated ${annotated}/${total} articles.`);
  return annotated;
}
