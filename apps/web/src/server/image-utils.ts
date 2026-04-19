import { normalizePublicImageUrl } from "./url-utils";
import { isProbablyArticleImageUrl } from "@/lib/image-suitability";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

function stripCdata(value: string): string {
  return value.replace(/<!\[CDATA\[/g, "").replace(/\]\]>/g, "");
}

function parseAttributes(attrString: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const regex = /([:\w-]+)\s*=\s*(["'])(.*?)\2/g;
  let match;
  while ((match = regex.exec(attrString)) !== null) {
    const key = match[1]?.toLowerCase();
    const value = match[3];
    if (key) attrs[key] = decodeHtmlEntities(value);
  }
  return attrs;
}

function findFirstTagAttribute(
  xml: string,
  tagName: string,
  attributeNames: string[],
  predicate?: (attrs: Record<string, string>) => boolean
): string | null {
  const regex = new RegExp(`<${escapeRegExp(tagName)}\\b([^>]*)>`, "gi");
  let match;
  while ((match = regex.exec(xml)) !== null) {
    const attrs = parseAttributes(match[1] ?? "");
    if (predicate && !predicate(attrs)) {
      continue;
    }

    for (const attributeName of attributeNames) {
      const value = attrs[attributeName.toLowerCase()];
      if (!value) continue;
      return value;
    }
  }

  return null;
}

function extractTagContent(xml: string, tagName: string): string | null {
  const regex = new RegExp(
    `<${escapeRegExp(tagName)}[^>]*>([\\s\\S]*?)<\\/${escapeRegExp(tagName)}>`,
    "i"
  );
  const match = xml.match(regex);
  return match ? match[1]?.trim() ?? null : null;
}

function extractImageFromHtmlMarkup(
  html: string,
  baseUrl?: string | null
): string | null {
  const imgRegex = /<img\b([^>]*)>/gi;
  let match;
  while ((match = imgRegex.exec(html)) !== null) {
    const attrs = parseAttributes(match[1] ?? "");
    const candidate =
      attrs.src ??
      attrs["data-src"] ??
      attrs["data-original"] ??
      attrs["data-lazy-src"] ??
      null;

    if (candidate) {
      const normalized = normalizePublicImageUrl(candidate, baseUrl);
      if (normalized && isProbablyArticleImageUrl(normalized)) return normalized;
    }

    const srcset = attrs.srcset;
    if (srcset) {
      const firstUrl = srcset.split(",")[0]?.trim().split(/\s+/)[0];
      if (firstUrl) {
        const normalized = normalizePublicImageUrl(firstUrl, baseUrl);
        if (normalized && isProbablyArticleImageUrl(normalized)) return normalized;
      }
    }
  }

  return null;
}

function findMetaImageUrl(html: string, baseUrl?: string | null): string | null {
  const metaCandidates = [
    {
      tagName: "meta",
      predicate: (attrs: Record<string, string>) =>
        attrs.property === "og:image" ||
        attrs.property === "og:image:secure_url" ||
        attrs.property === "og:image:url",
      attributeNames: ["content"],
    },
    {
      tagName: "meta",
      predicate: (attrs: Record<string, string>) =>
        attrs.name === "twitter:image" || attrs.name === "twitter:image:src",
      attributeNames: ["content"],
    },
    {
      tagName: "link",
      predicate: (attrs: Record<string, string>) =>
        (attrs.rel ?? "")
          .split(/\s+/)
          .map((part) => part.toLowerCase())
          .includes("image_src"),
      attributeNames: ["href"],
    },
  ];

  for (const candidate of metaCandidates) {
    const value = findFirstTagAttribute(
      html,
      candidate.tagName,
      candidate.attributeNames,
      candidate.predicate
    );
    if (!value) continue;

    const normalized = normalizePublicImageUrl(value, baseUrl);
    if (normalized && isProbablyArticleImageUrl(normalized)) return normalized;
  }

  return null;
}

function extractContentCandidates(
  xml: string,
  baseUrl?: string | null
): string | null {
  const tags = ["content:encoded", "description", "summary", "content"];

  for (const tagName of tags) {
    const value = extractTagContent(xml, tagName);
    if (!value) continue;

    const cleaned = stripCdata(decodeHtmlEntities(value));
    const image = extractImageFromHtmlMarkup(cleaned, baseUrl);
    if (image) return image;
  }

  return null;
}

export function extractPageImageUrl(
  html: string,
  baseUrl?: string | null
): string | null {
  const cleaned = stripCdata(decodeHtmlEntities(html));
  return (
    findMetaImageUrl(cleaned, baseUrl) ??
    extractImageFromHtmlMarkup(cleaned, baseUrl)
  );
}

export function extractFeedImageUrl(
  xml: string,
  baseUrl?: string | null
): string | null {
  const cleaned = stripCdata(decodeHtmlEntities(xml));

  const structuredCandidates: Array<{
    tagName: string;
    attributeNames: string[];
    predicate?: (attrs: Record<string, string>) => boolean;
  }> = [
    {
      tagName: "media:thumbnail",
      attributeNames: ["url", "href"],
    },
    {
      tagName: "itunes:image",
      attributeNames: ["href", "src"],
    },
    {
      tagName: "media:content",
      attributeNames: ["url", "href"],
      predicate: (attrs: Record<string, string>) =>
        !attrs.type || attrs.type.toLowerCase().startsWith("image/"),
    },
    {
      tagName: "enclosure",
      attributeNames: ["url", "href"],
      predicate: (attrs: Record<string, string>) =>
        !attrs.type || attrs.type.toLowerCase().startsWith("image/"),
    },
  ];

  for (const candidate of structuredCandidates) {
    const value = findFirstTagAttribute(
      cleaned,
      candidate.tagName,
      candidate.attributeNames,
      candidate.predicate
    );
    if (!value) continue;

    const normalized = normalizePublicImageUrl(value, baseUrl);
    if (normalized && isProbablyArticleImageUrl(normalized)) return normalized;
  }

  return extractContentCandidates(cleaned, baseUrl);
}
