import { describe, expect, it } from "vitest";
import { normalizePublicImageUrl, normalizePublicUrl } from "@/server/url-utils";

describe("normalizePublicUrl", () => {
  it("keeps allowed public URLs", () => {
    expect(
      normalizePublicUrl("https://www.theverge.com/foo#bar", ["theverge.com"])
    ).toBe("https://www.theverge.com/foo");
  });

  it("rejects mismatched hosts", () => {
    expect(
      normalizePublicUrl("https://example.com/foo", ["theverge.com"])
    ).toBeNull();
  });

  it("rejects private hosts", () => {
    expect(
      normalizePublicUrl("https://localhost/foo", ["theverge.com"])
    ).toBeNull();
  });

  it("normalizes public image URLs and resolves relative paths", () => {
    expect(
      normalizePublicImageUrl("/images/story.jpg#hero", "https://www.theverge.com/story")
    ).toBe("https://www.theverge.com/images/story.jpg");
  });

  it("rejects private image hosts", () => {
    expect(
      normalizePublicImageUrl("http://127.0.0.1/story.jpg")
    ).toBeNull();
  });
});
