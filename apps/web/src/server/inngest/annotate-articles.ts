import { inngest } from "./client";
import { classifyArticle } from "../article-classifier";
import { db } from "../db/client";

/**
 * annotateArticles Job - Triggered on article insert
 * Calls OpenAI to annotate articles with topics, entities, quality_score, and dedupe_key
 */
export const annotateArticles = inngest.createFunction(
  {
    id: "annotate-articles",
    name: "Annotate Articles with AI Classification",
    retries: 2,
    triggers: [
      {
        event: "article.inserted",
      },
    ],
  },
  async ({ step, event }) => {
    const { article_id } = event.data;

    // Step 1: Fetch the article
    const article = await step.run("fetch-article", async () => {
      return await db.articles.findUnique({
        where: { id: article_id },
        select: {
          id: true,
          title: true,
          source_name: true,
          snippet: true,
        },
      });
    });

    if (!article) {
      throw new Error(`Article ${article_id} not found`);
    }

    // Check if already annotated
    const existing = await db.article_annotations.findUnique({
      where: { article_id },
    });
    if (existing) {
      return { status: "skipped", reason: "already annotated" };
    }

    // Step 2: Classify with OpenAI
    const classification = await step.run("classify-article", async () => {
      return await classifyArticle({
        title: article.title,
        source: article.source_name,
        snippet: article.snippet,
      });
    });

    // Step 3: Save annotation
    const result = await step.run("save-annotation", async () => {
      await db.article_annotations.create({
        data: {
          article_id: article.id,
          topics_json: JSON.stringify(classification.topics),
          entities_json: JSON.stringify(classification.entities),
          quality_score: classification.quality_score,
          dedupe_key: classification.dedupe_key,
        },
      });

      return classification;
    });

    return {
      status: "success",
      article_id,
      topics: result.topics,
      entities: result.entities,
      quality_score: result.quality_score,
      dedupe_key: result.dedupe_key,
    };
  }
);
