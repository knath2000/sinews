/**
 * Shared progress types, phases, orders, and messages for brief generation.
 * This module lives outside `@/server/` so both client and server code can
 * import it without crossing the server/client boundary.
 */

export interface BriefProgress {
  phase: string;
  message: string;
  step: number;
  totalSteps: number;
  itemsCompleted: number;
  itemsTotal: number;
  updatedAt: string;
}

export const BRIEF_PHASES = [
  "starting",
  "building_profile",
  "loading_candidates",
  "ranking_candidates",
  "writing_summaries",
  "finalizing",
] as const;

export const PHASE_ORDER: Record<string, number> = {
  starting: 0,
  building_profile: 1,
  loading_candidates: 2,
  ranking_candidates: 3,
  writing_summaries: 4,
  finalizing: 5,
  failed: 6,
};

export const PHASE_MESSAGES: Record<string, string> = {
  starting: "Starting your brief",
  building_profile: "Analyzing your interests",
  loading_candidates: "Loading fresh stories",
  ranking_candidates: "Ranking the best matches",
  writing_summaries: "Writing summaries and recommendations",
  finalizing: "Finishing your brief",
  failed: "Brief generation failed. Try again.",
};
