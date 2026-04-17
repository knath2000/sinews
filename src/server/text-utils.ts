type SanitizeFeedTextOptions = {
  stripHtml?: boolean;
  collapseRepeated?: boolean;
  maxLength?: number;
};

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) =>
      String.fromCodePoint(Number.parseInt(hex, 16))
    )
    .replace(/&#(\d+);/g, (_, num: string) =>
      String.fromCodePoint(Number.parseInt(num, 10))
    );
}

function stripCdata(value: string): string {
  return value.replace(/<!\[CDATA\[/gi, "").replace(/\]\]>/g, "");
}

function stripHtmlTags(value: string): string {
  return value.replace(/<[^>]*>/g, " ");
}

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function collapseRepeatedContent(value: string): string {
  const words = value.split(" ");
  if (words.length < 4 || words.length % 2 !== 0) {
    return value;
  }

  const half = words.length / 2;
  const first = words.slice(0, half).join(" ");
  const second = words.slice(half).join(" ");

  return first === second ? first : value;
}

export function sanitizeFeedText(
  raw: string | null | undefined,
  options: SanitizeFeedTextOptions = {}
): string | null {
  if (raw === null || raw === undefined) {
    return null;
  }

  let text = raw.trim();
  if (!text) {
    return null;
  }

  text = stripCdata(text);
  text = decodeHtmlEntities(text);

  if (options.stripHtml) {
    text = stripHtmlTags(text);
  }

  text = collapseWhitespace(text);

  if (options.collapseRepeated) {
    text = collapseRepeatedContent(text);
  }

  text = collapseWhitespace(text);

  if (options.maxLength && text.length > options.maxLength) {
    text = text.slice(0, options.maxLength).trim();
  }

  return text || null;
}

export function sanitizeFeedTitle(raw: string | null | undefined): string | null {
  return sanitizeFeedText(raw, { collapseRepeated: true });
}

export function sanitizeFeedSnippet(raw: string | null | undefined): string | null {
  return sanitizeFeedText(raw, { stripHtml: true, maxLength: 500 });
}
