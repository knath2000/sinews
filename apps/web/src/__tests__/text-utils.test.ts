import { describe, expect, it } from "vitest";
import {
  sanitizeFeedSnippet,
  sanitizeFeedText,
  sanitizeFeedTitle,
} from "@/server/text-utils";

describe("text-utils", () => {
  it("strips CDATA wrappers and collapses duplicated titles", () => {
    expect(
      sanitizeFeedTitle(
        "<![CDATA[How Netflix made us fall in love with K-dramas]]>\n<![CDATA[How Netflix made us fall in love with K-dramas]]>"
      )
    ).toBe("How Netflix made us fall in love with K-dramas");
  });

  it("decodes entities and strips html from snippets", () => {
    expect(
      sanitizeFeedSnippet(
        "<p><![CDATA[How <strong>Netflix</strong> made us fall in love with K-dramas &amp; more]]></p>"
      )
    ).toBe("How Netflix made us fall in love with K-dramas & more");
  });

  it("supports generic text cleanup", () => {
    expect(
      sanitizeFeedText("  <![CDATA[AI&nbsp;news]]>   ", {
        collapseRepeated: true,
      })
    ).toBe("AI news");
  });
});
