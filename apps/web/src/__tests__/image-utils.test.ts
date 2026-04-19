import { afterEach, describe, expect, it, vi } from "vitest";
import {
  extractFeedImageUrl,
  extractPageImageUrl,
} from "@/server/image-utils";
import { fetchArticlePageImageUrl } from "@/server/news-fetcher";
import { isProbablyArticleImageUrl } from "@/lib/image-suitability";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("image extraction", () => {
  it("extracts RSS media thumbnails first", () => {
    const xml = `
      <item>
        <title>Story</title>
        <link>https://example.com/story</link>
        <media:thumbnail url="https://images.example.com/thumb.jpg" />
        <description><![CDATA[<p><img src="https://images.example.com/desc.jpg" /></p>]]></description>
      </item>
    `;

    expect(extractFeedImageUrl(xml, "https://example.com/story")).toBe(
      "https://images.example.com/thumb.jpg"
    );
  });

  it("extracts image markup from feed descriptions", () => {
    const xml = `
      <item>
        <title>Story</title>
        <link>https://example.com/story</link>
        <description><![CDATA[<p><img src="/images/desc.jpg" /></p>]]></description>
      </item>
    `;

    expect(extractFeedImageUrl(xml, "https://example.com/story")).toBe(
      "https://example.com/images/desc.jpg"
    );
  });

  it("extracts og:image from article pages", () => {
    const html = `
      <html>
        <head>
          <meta property="og:image" content="https://images.example.com/hero.jpg" />
        </head>
      </html>
    `;

    expect(extractPageImageUrl(html, "https://example.com/story")).toBe(
      "https://images.example.com/hero.jpg"
    );
  });

  it("falls back to the article page fetch helper", async () => {
    const html = `
      <html>
        <head>
          <meta name="twitter:image" content="https://images.example.com/twitter.jpg" />
        </head>
      </html>
    `;

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => html,
    } as Response);

    await expect(
      fetchArticlePageImageUrl("https://example.com/story")
    ).resolves.toBe("https://images.example.com/twitter.jpg");
  });

  it("accepts normal article hero images", () => {
    expect(
      isProbablyArticleImageUrl("https://images.example.com/news/ai-breakthrough-hero.jpg")
    ).toBe(true);
  });

  it("rejects logo and avatar style image urls", () => {
    expect(
      isProbablyArticleImageUrl("https://images.example.com/assets/site-logo.png")
    ).toBe(false);
    expect(
      isProbablyArticleImageUrl("https://cdn.example.com/author/avatar-64x64.jpg")
    ).toBe(false);
  });

  it("rejects obviously generic social preview images", () => {
    expect(
      isProbablyArticleImageUrl("https://images.example.com/social-share/default-image.jpg")
    ).toBe(false);
    expect(
      isProbablyArticleImageUrl("https://i.ytimg.com/vi/example/hqdefault.jpg")
    ).toBe(false);
  });
});
