import { describe, expect, it } from "vitest";
import { normalizeFeedPayload } from "@/app/feed/feed-response";

describe("normalizeFeedPayload", () => {
  it("accepts a well-formed feed payload with provenance", () => {
    expect(
      normalizeFeedPayload({
        articles: [
          {
            id: 1,
            title: "Example story",
            source_name: "The Verge",
            canonical_url: "https://www.theverge.com/example-story",
            image_url: "https://images.example.com/story.jpg",
            published_at: "2026-04-16T09:00:00.000Z",
            summary: "Summary",
            why_recommended: "Matches your interests",
            matched_signals: ["ai", "apple"],
            provenance: {
              matched_topics: ["artificial_intelligence"],
              matched_entities: ["OpenAI"],
              safari_history_import: {
                contributed: true,
                top_topics: [
                  { topic: "developer_tools", weight: 1.23 },
                ],
                top_domains: [
                  { domain: "github.com", weight: 0.75 },
                ],
              },
            },
            rank: 1,
            score: 0.94,
            brief_item_id: 101,
          },
        ],
        generatedAt: "2026-04-16T10:00:00.000Z",
      })
    ).toEqual({
      articles: [
        {
          id: 1,
          title: "Example story",
          source_name: "The Verge",
          canonical_url: "https://www.theverge.com/example-story",
          image_url: "https://images.example.com/story.jpg",
          published_at: "2026-04-16T09:00:00.000Z",
          summary: "Summary",
          why_recommended: "Matches your interests",
          matched_signals: ["ai", "apple"],
          provenance: {
            matched_topics: ["artificial_intelligence"],
            matched_entities: ["OpenAI"],
            safari_history_import: {
              contributed: true,
              top_topics: [
                { topic: "developer_tools", weight: 1.23 },
              ],
              top_domains: [
                { domain: "github.com", weight: 0.75 },
              ],
            },
          },
          rank: 1,
          score: 0.94,
          brief_item_id: 101,
        },
      ],
      generatedAt: "2026-04-16T10:00:00.000Z",
    });
  });

  it("accepts older payloads without provenance", () => {
    expect(
      normalizeFeedPayload({
        articles: [
          {
            id: 2,
            title: "Second story",
            source_name: "Wired",
            canonical_url: "https://www.wired.com/story",
            image_url: null,
            published_at: null,
            summary: null,
            why_recommended: null,
            matched_signals: null,
            rank: 2,
            score: 0.88,
            brief_item_id: 102,
          },
        ],
        generatedAt: null,
      })
    ).toEqual({
      articles: [
        {
          id: 2,
          title: "Second story",
          source_name: "Wired",
          canonical_url: "https://www.wired.com/story",
          image_url: null,
          published_at: null,
          summary: null,
          why_recommended: null,
          matched_signals: null,
          provenance: null,
          rank: 2,
          score: 0.88,
          brief_item_id: 102,
        },
      ],
      generatedAt: null,
    });
  });

  it("rejects payloads without an articles array", () => {
    expect(normalizeFeedPayload({ generatedAt: "2026-04-16T10:00:00.000Z" })).toBeNull();
  });

  it("rejects payloads with malformed article entries", () => {
    expect(
      normalizeFeedPayload({
        articles: [
          {
            id: "1",
            title: "Example story",
            source_name: "The Verge",
            canonical_url: "https://www.theverge.com/example-story",
            published_at: "2026-04-16T09:00:00.000Z",
            summary: "Summary",
            why_recommended: "Matches your interests",
            matched_signals: ["ai", "apple"],
            rank: 1,
            score: 0.94,
            brief_item_id: 101,
          },
        ],
      })
    ).toBeNull();
  });
});
