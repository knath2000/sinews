export interface SafariAggregateItem {
  label: string;
  count: number;
  weight: number;
}

export interface SafariImportSummary {
  acceptedCount: number;
  topTopics: Array<{ topic: string; count: number }>;
  topDomains: Array<{ domain: string; count: number }>;
  behaviorBlurb: string;
}

export interface SafariBriefProvenance {
  matched_topics: string[];
  matched_entities: string[];
  safari_history_import: {
    contributed: boolean;
    top_topics: Array<{ topic: string; weight: number }>;
    top_domains: Array<{ domain: string; weight: number }>;
  } | null;
}

export interface SafariBriefProvenanceInput {
  matchedTopics: string[];
  matchedEntities: string[];
  safariTopicWeights: Map<string, number>;
  safariTopicDomainWeights: Map<string, Map<string, number>>;
}

function toFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

function isContributionArray(
  value: unknown,
  key: "topic" | "domain"
): value is Array<{ topic: string; weight: number } | { domain: string; weight: number }> {
  if (!Array.isArray(value)) {
    return false;
  }

  return value.every((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      return false;
    }

    const row = entry as Record<string, unknown>;
    return typeof row[key] === "string" && toFiniteNumber(row.weight) !== null;
  });
}

function sortAggregateItems(a: SafariAggregateItem, b: SafariAggregateItem): number {
  if (b.weight !== a.weight) return b.weight - a.weight;
  if (b.count !== a.count) return b.count - a.count;
  return a.label.localeCompare(b.label);
}

export function humanizeSafariTopic(topic: string): string {
  return topic.replace(/_/g, " ");
}

export function joinHumanList(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function roundContribution(weight: number): number {
  return Math.round(weight * 1000) / 1000;
}

export function buildSafariImportSummary(input: {
  acceptedCount: number;
  topics: SafariAggregateItem[];
  domains: SafariAggregateItem[];
}): SafariImportSummary {
  const topTopics = [...input.topics].sort(sortAggregateItems).slice(0, 3);
  const topDomains = [...input.domains].sort(sortAggregateItems).slice(0, 3);
  const humanTopics = topTopics.map((entry) => humanizeSafariTopic(entry.label));

  const behaviorBlurb =
    humanTopics.length > 0
      ? `Your Safari activity leans toward ${joinHumanList(humanTopics)}.`
      : "Safari history is confirmed and shaping your brief.";

  return {
    acceptedCount: input.acceptedCount,
    topTopics: topTopics.map((entry) => ({ topic: entry.label, count: entry.count })),
    topDomains: topDomains.map((entry) => ({ domain: entry.label, count: entry.count })),
    behaviorBlurb,
  };
}

export function buildBriefItemProvenance(
  input: SafariBriefProvenanceInput
): SafariBriefProvenance {
  const matchedTopics = Array.from(new Set(input.matchedTopics));
  const matchedEntities = Array.from(new Set(input.matchedEntities));

  const safariTopics = matchedTopics
    .map((topic) => ({
      topic,
      weight: input.safariTopicWeights.get(topic) ?? 0,
    }))
    .filter((entry) => entry.weight > 0)
    .sort((a, b) => {
      if (b.weight !== a.weight) return b.weight - a.weight;
      return a.topic.localeCompare(b.topic);
    })
    .slice(0, 3);

  if (safariTopics.length === 0) {
    return {
      matched_topics: matchedTopics,
      matched_entities: matchedEntities,
      safari_history_import: null,
    };
  }

  const safariDomains = new Map<string, number>();
  for (const topic of safariTopics) {
    const topicDomains = input.safariTopicDomainWeights.get(topic.topic);
    if (!topicDomains) continue;
    for (const [domain, weight] of topicDomains) {
      safariDomains.set(domain, (safariDomains.get(domain) ?? 0) + weight);
    }
  }

  const topDomains = [...safariDomains.entries()]
    .map(([domain, weight]) => ({ domain, weight }))
    .sort((a, b) => {
      if (b.weight !== a.weight) return b.weight - a.weight;
      return a.domain.localeCompare(b.domain);
    })
    .slice(0, 3);

  return {
    matched_topics: matchedTopics,
    matched_entities: matchedEntities,
    safari_history_import: {
      contributed: true,
      top_topics: safariTopics.map((entry) => ({
        topic: entry.topic,
        weight: roundContribution(entry.weight),
      })),
      top_domains: topDomains.map((entry) => ({
        domain: entry.domain,
        weight: roundContribution(entry.weight),
      })),
    },
  };
}

export function isSafariBriefProvenance(value: unknown): value is SafariBriefProvenance {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;
  if (!isStringArray(record.matched_topics) || !isStringArray(record.matched_entities)) {
    return false;
  }

  const safari = record.safari_history_import;
  if (safari === null) {
    return true;
  }

  if (!safari || typeof safari !== "object" || Array.isArray(safari)) {
    return false;
  }

  const safariRecord = safari as Record<string, unknown>;
  if (typeof safariRecord.contributed !== "boolean") {
    return false;
  }

  return (
    isContributionArray(safariRecord.top_topics, "topic") &&
    isContributionArray(safariRecord.top_domains, "domain")
  );
}

export function parseBriefItemProvenance(
  value: string | null
): SafariBriefProvenance | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return isSafariBriefProvenance(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
