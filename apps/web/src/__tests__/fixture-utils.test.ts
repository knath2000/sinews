import { describe, expect, it } from "vitest";
import { isFixtureArticle } from "@/server/fixture-utils";

describe("isFixtureArticle", () => {
  it("treats explicit fixtures as fixtures", () => {
    expect(
      isFixtureArticle({
        is_fixture: true,
        canonical_url: "https://example.com/article",
      })
    ).toBe(true);
  });

  it("treats legacy seed markers as fixtures", () => {
    expect(
      isFixtureArticle({
        canonical_url: "https://the-verge.com/synthetic-article-1776281633883-51",
        license_class: "fair_use",
      })
    ).toBe(true);
  });

  it("allows live articles with no fixture markers", () => {
    expect(
      isFixtureArticle({
        canonical_url: "https://www.theverge.com/2026/04/16/live-story",
        license_class: null,
      })
    ).toBe(false);
  });
});

