import { describe, expect, it } from "vitest";
import {
  buildBriefItemProvenance,
  buildSafariImportSummary,
  parseBriefItemProvenance,
} from "@/lib/safari-insights";

describe("safari insights helpers", () => {
  it("builds a readable safari import summary", () => {
    expect(
      buildSafariImportSummary({
        acceptedCount: 3734,
        topics: [
          { label: "developer_tools", count: 30, weight: 2.3 },
          { label: "cloud_computing", count: 17, weight: 1.6 },
          { label: "artificial_intelligence", count: 21, weight: 1.2 },
        ],
        domains: [
          { label: "github.com", count: 14, weight: 1.5 },
          { label: "console.cloud.google.com", count: 10, weight: 1.2 },
          { label: "reddit.com", count: 8, weight: 0.9 },
        ],
      })
    ).toEqual({
      acceptedCount: 3734,
      topTopics: [
        { topic: "developer_tools", count: 30 },
        { topic: "cloud_computing", count: 17 },
        { topic: "artificial_intelligence", count: 21 },
      ],
      topDomains: [
        { domain: "github.com", count: 14 },
        { domain: "console.cloud.google.com", count: 10 },
        { domain: "reddit.com", count: 8 },
      ],
      behaviorBlurb:
        "Your Safari activity leans toward developer tools, cloud computing, and artificial intelligence.",
    });
  });

  it("builds safari provenance only when safari contributed", () => {
    expect(
      buildBriefItemProvenance({
        matchedTopics: ["developer_tools", "cloud_computing", "ai_safety"],
        matchedEntities: ["OpenAI"],
        safariTopicWeights: new Map([
          ["developer_tools", 1.25],
          ["cloud_computing", 0.75],
        ]),
        safariTopicDomainWeights: new Map([
          [
            "developer_tools",
            new Map([
              ["github.com", 0.9],
              ["console.cloud.google.com", 0.35],
            ]),
          ],
          [
            "cloud_computing",
            new Map([["console.cloud.google.com", 0.75]]),
          ],
        ]),
      })
    ).toEqual({
      matched_topics: ["developer_tools", "cloud_computing", "ai_safety"],
      matched_entities: ["OpenAI"],
        safari_history_import: {
        contributed: true,
        top_topics: [
          { topic: "developer_tools", weight: 1.25 },
          { topic: "cloud_computing", weight: 0.75 },
        ],
        top_domains: [
          { domain: "console.cloud.google.com", weight: 1.1 },
          { domain: "github.com", weight: 0.9 },
        ],
      },
    });
  });

  it("parses provenance safely", () => {
    expect(
      parseBriefItemProvenance(
        JSON.stringify({
          matched_topics: ["developer_tools"],
          matched_entities: ["OpenAI"],
          safari_history_import: null,
        })
      )
    ).toEqual({
      matched_topics: ["developer_tools"],
      matched_entities: ["OpenAI"],
      safari_history_import: null,
    });
  });
});
