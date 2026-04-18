/**
 * sessionStorage-backed cache for the daily brief.
 * - First load: fetch from API, store in cache
 * - Subsequent loads: render from cache immediately, revalidate in background
 * - Cache invalidates at midnight (new brief date)
 */

import { FeedPayload } from "./feed-response";

const CACHE_KEY = "ai-news-feed-brief";

interface CachedBrief {
  payload: FeedPayload;
  storedAt: number;
  date: string; // YYYY-MM-DD of the brief
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getCachedBrief(): FeedPayload | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cached: CachedBrief = JSON.parse(raw);
    if (cached.date !== todayStr() || !cached.payload?.articles?.length) return null;
    return cached.payload;
  } catch {
    return null;
  }
}

export function setCachedBrief(payload: FeedPayload): void {
  try {
    const entry: CachedBrief = { payload, storedAt: Date.now(), date: todayStr() };
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
