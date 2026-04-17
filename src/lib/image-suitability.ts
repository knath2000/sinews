const BLOCKED_HOST_PATTERNS = [
  /(^|\.)ytimg\.com$/i,
  /(^|\.)youtube\.com$/i,
  /(^|\.)youtu\.be$/i,
  /(^|\.)vimeo\.com$/i,
  /(^|\.)dailymotion\.com$/i,
  /(^|\.)gravatar\.com$/i,
];

const BLOCKED_PATH_PATTERNS = [
  /(^|[/_-])(logo|logos|icon|icons|favicon|avatar|profile|author|badge|sprite|placeholder|default-image|default-share|apple-touch-icon)([._/-]|$)/i,
  /(^|[/_-])(poster|video-still|video-thumb|video-thumbnail|social-share|share-image|sharing|embed|playlist)([._/-]|$)/i,
  /(^|[/_-])(blank|transparent|spacer|pixel|1x1)([._/-]|$)/i,
  /(^|[/_-])(thumbnail-default|avatar-default|fallback)([._/-]|$)/i,
];

const BLOCKED_QUERY_PATTERNS = [
  /(?:^|[?&])(w|width|h|height)=([1-9]?\d)(?:&|$)/i,
  /(?:^|[?&])(size|s)=([1-9]?\d)(?:&|$)/i,
];

const BLOCKED_DIMENSION_PATTERN = /(^|[^\d])(16|24|32|48|64|96|120|150|180|200)x(16|24|32|48|64|96|120|150|180|200)([^\d]|$)/i;

export function isProbablyArticleImageUrl(value: string | null | undefined): boolean {
  if (!value || typeof value !== "string") {
    return false;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return false;
  }

  if (!/^https?:$/i.test(parsed.protocol)) {
    return false;
  }

  if (BLOCKED_HOST_PATTERNS.some((pattern) => pattern.test(parsed.hostname))) {
    return false;
  }

  const lowerPath = `${parsed.pathname}${parsed.search}`.toLowerCase();
  if (BLOCKED_PATH_PATTERNS.some((pattern) => pattern.test(lowerPath))) {
    return false;
  }

  if (BLOCKED_QUERY_PATTERNS.some((pattern) => pattern.test(parsed.search))) {
    return false;
  }

  if (BLOCKED_DIMENSION_PATTERN.test(lowerPath)) {
    return false;
  }

  return true;
}
