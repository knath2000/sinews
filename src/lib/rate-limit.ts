import { Redis } from "@upstash/redis";

let _redis: Redis | null = null;

/**
 * Lazily initialise the Upstash Redis client.
 * Returns null when env vars are missing (caller must handle).
 */
function getRedis(): Redis | null {
  if (_redis) return _redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) return null;

  _redis = new Redis({ url, token });
  return _redis;
}

/**
 * Sliding-window rate limiter backed by Redis sorted sets.
 *
 * Each call records a timestamp-scored entry. Entries older than the
 * window are pruned, and the count of remaining entries determines
 * whether the request is allowed.
 *
 * Key format: rl:{route}:{identifier}:{window}
 *
 * If Upstash is unreachable (connection error) the limiter fails open —
 * it returns { allowed: true } and logs a warning, so users are never
 * blocked by Redis downtime in alpha.
 *
 * @param key      - Rate-limit bucket key.  Convention: `rl:{route}:{identifier}:{window}`
 * @param limit    - Maximum number of requests allowed within the window.
 * @param windowMs - Window size in milliseconds.
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<{ allowed: boolean; retryAfter?: number; remaining: number }> {
  const redis = getRedis();
  if (!redis) {
    console.warn("[rate-limit] Upstash Redis not configured — failing open");
    return { allowed: true, remaining: limit };
  }

  const now = Date.now();
  const windowStart = now - windowMs;

  try {
    const pipeline = redis.pipeline();

    // Remove expired entries
    pipeline.zremrangebyscore(key, 0, windowStart);
    // Count current entries
    pipeline.zcard(key);
    // Add new entry (member = unique timestamp)
    pipeline.zadd(key, { score: now, member: `${now}-${Math.random()}` });
    // Set key TTL so it's cleaned up automatically
    pipeline.expire(key, Math.ceil(windowMs / 1000) + 10);

    const results = await pipeline.exec<[number, number, number, number]>();

    // results structure: [zremRangeCount, cardCount, zaddCount, expireResult]
    const countBeforeAdd = results?.[1] ?? 0;
    const remaining = Math.max(0, limit - countBeforeAdd - 1);

    if (countBeforeAdd >= limit) {
      // Find the oldest entry to compute retry-after
      const oldest = await redis.zrange(key, 0, 0, {
        withScores: true,
      });
      let retryAfter: number | undefined;
      if (oldest.length > 1) {
        const oldestTimestamp = oldest[1] as unknown as number;
        retryAfter = Math.ceil((oldestTimestamp + windowMs - now) / 1000);
        if (retryAfter < 0) retryAfter = 1;
      }
      return { allowed: false, retryAfter, remaining: 0 };
    }

    return { allowed: true, remaining };
  } catch (err) {
    console.warn("[rate-limit] Upstash Redis error — failing open:", err);
    return { allowed: true, remaining: limit };
  }
}

/**
 * Helper to build a rate-limit key following the project convention.
 */
export function rateLimitKey(
  route: string,
  identifier: string,
  windowMs: number,
): string {
  // Derive a window label so keys don't collide across different windows
  const windowLabel = Math.ceil(windowMs / 1000);
  return `rl:${route}:${identifier}:${windowLabel}`;
}
