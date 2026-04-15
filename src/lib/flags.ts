/**
 * Shared feature flag definitions.
 *
 * Each key maps to its default value. Defaults are used as fallback
 * when a flag is missing from the database.
 */
export const FLAG_KEYS = {
  enable_x_sync: true,
  enable_google_sync: true,
  enable_feedback_ranking: true,
  enable_precompute: false,
  enable_source_policy: true,
  enable_demo_mode: true,
  enable_delete_account: true,
} as const;

export type FlagKey = keyof typeof FLAG_KEYS;
