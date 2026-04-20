/**
 * sessionStorage-backed cache for the daily brief.
 * - First load: fetch from API, store in cache
 * - Subsequent loads: render from cache immediately, revalidate in background
 * - Cache invalidates at midnight (new brief date)
 * - Cache invalidates on version bump (BREAKING_CACHE_VERSION)
 */

import { FeedPayload } from "./feed-response";

const CACHE_KEY = "ai-news-feed-brief";
const CACHE_VERSION_KEY = "ai-news-feed-brief-version";

/**
 * Bump this integer whenever the FeedPayload shape or brief semantics
 * change in a way that makes previously cached data untrustworthy.
 * v2: added replacementNotice field; stale v1 briefs cannot carry it.
 */
export const CACHE_VERSION = 2;

interface CachedBrief {
  payload: FeedPayload;
  storedAt: number;
  date: string; // YYYY-MM-DD of the brief
  version: number;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getCachedBrief(): FeedPayload | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cached: CachedBrief = JSON.parse(raw);
    if (cached.version !== CACHE_VERSION) return null;
    if (cached.date !== todayStr() || !cached.payload?.articles?.length) return null;
    return cached.payload;
  } catch {
    return null;
  }
}

export function setCachedBrief(payload: FeedPayload): void {
  try {
    const entry: CachedBrief = { payload, storedAt: Date.now(), date: todayStr(), version: CACHE_VERSION };
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    // Storage blocked or full — silent
  }
}

export function clearCachedBrief(): void {
  try {
    sessionStorage.removeItem(CACHE_KEY);
  } catch {
    // Storage blocked — silent
  }
}
