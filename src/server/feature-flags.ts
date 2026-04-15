import { db } from "./db/client";
import { FLAG_KEYS, type FlagKey } from "@/lib/flags";

/**
 * Feature flag backend.
 *
 * - Queries the `feature_flags` table via Prisma.
 * - 30-second in-memory TTL cache per Node.js process instance.
 * - Falls back to the FLAG_KEYS default when a flag is absent from the DB.
 * - Seeding: on first call, guarantees all 7 flag keys exist in the DB
 *   with their default values.
 */

// -- In-memory TTL cache (30 s) ---------------------------------------------

interface CacheEntry {
  value: boolean;
  expiresAt: number;
}

const cache = new Map<FlagKey, CacheEntry>();
const CACHE_TTL_MS = 30_000;

// Guard so we only run seeding once per process lifetime.
let seeded = false;

/**
 * Ensure every known flag key has a row in the database.
 * Called once on first invocation of `isFeatureEnabled`.
 */
async function seedFlags(): Promise<void> {
  if (seeded) return;
  seeded = true;

  const entries = await db.feature_flags.findMany({
    select: { flag_key: true },
  });
  const existing = new Set(entries.map((e) => e.flag_key));

  const missing: { flag_key: string; enabled: boolean }[] = [];

  for (const [key, defaultValue] of Object.entries(FLAG_KEYS)) {
    if (!existing.has(key)) {
      missing.push({ flag_key: key, enabled: defaultValue });
    }
  }

  if (missing.length > 0) {
    await db.feature_flags.createMany({ data: missing });
  }
}

/**
 * Read the current flag value from the database (uncached).
 * Returns the FLAG_KEYS default when no row exists.
 */
async function readFlagFromDb(flag: FlagKey): Promise<boolean> {
  const row = await db.feature_flags.findUnique({
    where: { flag_key: flag },
    select: { enabled: true },
  });
  return row?.enabled ?? FLAG_KEYS[flag];
}

/**
 * Returns whether the given feature flag is enabled.
 *
 * Optionally pass a userId to support per-user overrides in the future
 * (via `rules_json` parsing). Currently userId is unused but the
 * signature is prepared for that extension.
 *
 * @param flag    - The flag key to check.
 * @param userId  - Optional user ID for future per-user overrides.
 */
export async function isFeatureEnabled(
  flag: FlagKey,
  _userId?: string,
): Promise<boolean> {
  // Seed on first call
  await seedFlags();

  // Check cache
  const entry = cache.get(flag);
  if (entry && Date.now() < entry.expiresAt) {
    return entry.value;
  }

  const value = await readFlagFromDb(flag);

  cache.set(flag, {
    value,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  return value;
}

/**
 * Invalidate the cached value for a flag.
 * Call this after an admin updates a flag so the new value
 * is visible within 30 s without waiting for TTL expiry.
 */
export function invalidateFlagCache(flag: FlagKey): void {
  cache.delete(flag);
}
