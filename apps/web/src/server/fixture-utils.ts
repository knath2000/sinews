type FixtureLikeArticle = {
  is_fixture?: boolean | null;
  license_class?: string | null;
  provider?: string | null;
  canonical_url?: string | null;
};

const LEGACY_SYNTHETIC_URL_PATTERN = /-\d{10,}-\d+$/;

/**
 * Transitional fixture detection.
 *
 * `is_fixture` is the canonical marker for future data. The legacy checks are
 * here so the current seeded database stops entering user-facing flows before
 * we run a destructive cleanup.
 */
export function isFixtureArticle(article: FixtureLikeArticle): boolean {
  if (article.is_fixture) return true;
  if (article.provider === "seed") return true;
  if (article.license_class === "fair_use") return true;

  const canonicalUrl = article.canonical_url ?? "";
  return LEGACY_SYNTHETIC_URL_PATTERN.test(canonicalUrl);
}

