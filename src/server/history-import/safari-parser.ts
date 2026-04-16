import { createReadStream, createWriteStream } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import yauzl, { type Entry } from "yauzl";

// stream-json (ESM-compatible imports)
import { parser as createJSONParser } from "stream-json";
import { pick } from "stream-json/filters/Pick.js";
import { streamArray } from "stream-json/streamers/StreamArray.js";
import { streamValues } from "stream-json/streamers/StreamValues.js";

import {
  HISTORY_IMPORT_DOMAIN_WEIGHT_CAP,
  HISTORY_IMPORT_MAX_AGE_DAYS,
  TOPIC_DISPLAY_NAMES,
} from "@/lib/constants";
import { type TopicTaxonomy } from "@/server/taxonomy";

// ── Domain → topic mapping ─────────────────────────────────────────────────

const DOMAIN_TOPIC_MAP: Record<string, TopicTaxonomy[]> = {
  "techcrunch.com": ["startups_venture", "consumer_tech"],
  "arxiv.org": ["startups_venture", "tech_policy_regulation"],
  "nature.com": ["healthcare_biotech", "climate_energy"],
  "github.com": ["developer_tools"],
  "stackoverflow.com": ["developer_tools"],
  "apple.com": ["consumer_tech"],
  "theverge.com": ["consumer_tech"],
  "wired.com": ["cybersecurity", "tech_policy_regulation"],
  "reuters.com": ["tech_policy_regulation"],
  "bloomberg.com": ["startups_venture", "data_science_analytics"],
  "medium.com": ["developer_tools", "data_science_analytics"],
  "dev.to": ["developer_tools"],
  "hackernews.com": ["developer_tools", "cybersecurity"],
  "news.ycombinator.com": ["developer_tools", "startups_venture"],
  "arstechnica.com": ["cybersecurity", "startups_venture"],
  "techradar.com": ["consumer_tech", "developer_tools"],
  "engadget.com": ["consumer_tech"],
  "cnet.com": ["consumer_tech"],
  "mashable.com": ["consumer_tech"],
  "venturebeat.com": ["startups_venture"],
  "producthunt.com": ["startups_venture"],
  "reddit.com": ["developer_tools", "cybersecurity"],
  "nytimes.com": ["tech_policy_regulation"],
  "wsj.com": ["startups_venture"],
  "forbes.com": ["startups_venture"],
  "bbc.com": ["tech_policy_regulation"],
  "theguardian.com": ["tech_policy_regulation", "climate_energy"],
  "wired.co.uk": ["tech_policy_regulation"],
  "mit.edu": ["quantum_computing", "artificial_intelligence"],
  "stanford.edu": ["artificial_intelligence", "healthcare_biotech"],
  "openai.com": ["artificial_intelligence"],
  "deepmind.com": ["artificial_intelligence"],
  "anthropic.com": ["artificial_intelligence"],
  "cohere.com": ["artificial_intelligence"],
  "meta.com": ["artificial_intelligence", "consumer_tech"],
  "google.com": ["artificial_intelligence", "cloud_computing"],
  "blog.google": ["artificial_intelligence", "cloud_computing"],
  "developers.google.com": ["developer_tools", "artificial_intelligence"],
  "aws.amazon.com": ["cloud_computing"],
  "azure.microsoft.com": ["cloud_computing"],
  "cloud.google.com": ["cloud_computing"],
  "cloudflare.com": ["cloud_computing", "cybersecurity"],
  "nvidia.com": ["semiconductors_hardware", "artificial_intelligence"],
  "amd.com": ["semiconductors_hardware"],
  "intel.com": ["semiconductors_hardware"],
  "spacex.com": ["space_technology"],
  "nasa.gov": ["space_technology"],
  "space.com": ["space_technology"],
  "ieee.org": ["semiconductors_hardware", "artificial_intelligence"],
  "sciencedirect.com": ["healthcare_biotech", "climate_energy"],
  "springer.com": ["healthcare_biotech"],
  "ncbi.nlm.nih.gov": ["healthcare_biotech"],
  "crunchbase.com": ["startups_venture"],
  "techpolicy.com": ["tech_policy_regulation"],
  "ftc.gov": ["tech_policy_regulation"],
  "ec.europa.eu": ["tech_policy_regulation"],
  "biotech-investments.org": ["healthcare_biotech"],
  "cleantechnica.com": ["climate_energy"],
  "crypto.com": ["blockchain_crypto"],
  "cointelegraph.com": ["blockchain_crypto"],
  "coindesk.com": ["blockchain_crypto"],
  "ethereum.org": ["blockchain_crypto"],
  "bitcoin.org": ["blockchain_crypto"],
  "ibm.com": ["quantum_computing", "cloud_computing"],
  "rigetti.com": ["quantum_computing"],
  "x.com": ["consumer_tech"],
  "twitter.com": ["consumer_tech"],
  "huggingface.co": ["artificial_intelligence", "developer_tools"],
  "keras.io": ["artificial_intelligence", "machine_learning"],
  "pytorch.org": ["artificial_intelligence", "machine_learning"],
  "tensorflow.org": ["artificial_intelligence", "machine_learning"],
  "scikit-learn.org": ["machine_learning"],
  "langchain.com": ["artificial_intelligence", "developer_tools"],
  "robustintelligence.com": ["artificial_intelligence", "cybersecurity"],
  "databricks.com": ["data_science_analytics", "machine_learning"],
  "kaggle.com": ["data_science_analytics"],
  "tableau.com": ["data_science_analytics"],
  "sentry.io": ["developer_tools"],
  "vercel.com": ["developer_tools"],
  "netlify.com": ["developer_tools"],
  "stripe.com": ["developer_tools"],
  "twilio.com": ["developer_tools"],
  "shopify.com": ["startups_venture"],
  "notion.so": ["developer_tools"],
  "linear.app": ["developer_tools"],
  "figma.com": ["developer_tools"],
  "githubusercontent.com": ["developer_tools"],
  "npmjs.com": ["developer_tools"],
  "pypi.org": ["developer_tools"],
  "docker.com": ["developer_tools"],
  "kubernetes.io": ["developer_tools"],
  "react.dev": ["developer_tools"],
  "nextjs.org": ["developer_tools"],
  "vuejs.org": ["developer_tools"],
  "svelte.dev": ["developer_tools"],
};

const TITLE_KEYWORD_MAP: Record<string, TopicTaxonomy> = {
  "artificial intelligence": "artificial_intelligence",
  "ai model": "artificial_intelligence",
  "llm": "artificial_intelligence",
  "llms": "artificial_intelligence",
  "generative ai": "artificial_intelligence",
  "gpt": "artificial_intelligence",
  "openai": "artificial_intelligence",
  "prompt engineering": "artificial_intelligence",
  "machine learning": "machine_learning",
  "deep learning": "machine_learning",
  "neural network": "machine_learning",
  "neural networks": "machine_learning",
  "ml pipeline": "machine_learning",
  "training data": "machine_learning",
  "reinforcement learning": "machine_learning",
  "nlp": "natural_language_processing",
  "natural language": "natural_language_processing",
  "text classification": "natural_language_processing",
  "sentiment analysis": "natural_language_processing",
  "translation model": "natural_language_processing",
  "computer vision": "computer_vision",
  "image recognition": "computer_vision",
  "object detection": "computer_vision",
  "image generation": "computer_vision",
  "vision transformer": "computer_vision",
  "robotics": "robotics_automation",
  "automation": "robotics_automation",
  "autonomous vehicle": "robotics_automation",
  "self-driving": "robotics_automation",
  "drone": "robotics_automation",
  "rpa": "robotics_automation",
  "cyber attack": "cybersecurity",
  "ransomware": "cybersecurity",
  "zero-day": "cybersecurity",
  "exploit": "cybersecurity",
  "penetration test": "cybersecurity",
  "data breach": "cybersecurity",
  "phishing": "cybersecurity",
  "vulnerability": "cybersecurity",
  "zero trust": "cybersecurity",
  "cloud": "cloud_computing",
  "serverless": "cloud_computing",
  "kubernetes": "cloud_computing",
  "edge computing": "cloud_computing",
  "multi-cloud": "cloud_computing",
  "saas": "cloud_computing",
  "paas": "cloud_computing",
  "iaas": "cloud_computing",
  "big data": "data_science_analytics",
  "data engineering": "data_science_analytics",
  "data warehouse": "data_science_analytics",
  "data lake": "data_science_analytics",
  "analytics": "data_science_analytics",
  "business intelligence": "data_science_analytics",
  "blockchain": "blockchain_crypto",
  "cryptocurrency": "blockchain_crypto",
  "bitcoin": "blockchain_crypto",
  "ethereum": "blockchain_crypto",
  "defi": "blockchain_crypto",
  "smart contract": "blockchain_crypto",
  "nft": "blockchain_crypto",
  "web3": "blockchain_crypto",
  "tokenization": "blockchain_crypto",
  "quantum": "quantum_computing",
  "qubit": "quantum_computing",
  "quantum computing": "quantum_computing",
  "quantum supremacy": "quantum_computing",
  "startup": "startups_venture",
  "funding": "startups_venture",
  "series a": "startups_venture",
  "series b": "startups_venture",
  "series c": "startups_venture",
  "venture capital": "startups_venture",
  "seed round": "startups_venture",
  "ipo": "startups_venture",
  "acquisition": "startups_venture",
  "gdpr": "tech_policy_regulation",
  "privacy law": "tech_policy_regulation",
  "antitrust": "tech_policy_regulation",
  "regulation": "tech_policy_regulation",
  "compliance": "tech_policy_regulation",
  "digital markets": "tech_policy_regulation",
  "ftc": "tech_policy_regulation",
  "eu regulation": "tech_policy_regulation",
  "consumer electronics": "consumer_tech",
  "smartphone": "consumer_tech",
  "wearable": "consumer_tech",
  "tablet": "consumer_tech",
  "smart home": "consumer_tech",
  "ar vr": "consumer_tech",
  "vr headset": "consumer_tech",
  "meta quest": "consumer_tech",
  "developer": "developer_tools",
  "open source": "developer_tools",
  "api": "developer_tools",
  "sdk": "developer_tools",
  "compiler": "developer_tools",
  "devops": "developer_tools",
  "ci cd": "developer_tools",
  "semiconductor": "semiconductors_hardware",
  "gpu": "semiconductors_hardware",
  "cpu": "semiconductors_hardware",
  "chip": "semiconductors_hardware",
  "processor": "semiconductors_hardware",
  "silicon": "semiconductors_hardware",
  "tsmc": "semiconductors_hardware",
  "biotech": "healthcare_biotech",
  "genomics": "healthcare_biotech",
  "crispr": "healthcare_biotech",
  "drug discovery": "healthcare_biotech",
  "clinical trial": "healthcare_biotech",
  "mrna": "healthcare_biotech",
  "personalized medicine": "healthcare_biotech",
  "healthtech": "healthcare_biotech",
  "climate": "climate_energy",
  "solar": "climate_energy",
  "wind energy": "climate_energy",
  "carbon neutral": "climate_energy",
  "green tech": "climate_energy",
  "sustainability": "climate_energy",
  "carbon capture": "climate_energy",
  "fusion": "climate_energy",
  "ev": "climate_energy",
  "electric vehicle": "climate_energy",
  "space": "space_technology",
  "satellite": "space_technology",
  "launch": "space_technology",
  "mars": "space_technology",
  "lunar": "space_technology",
  "orbital": "space_technology",
  "rocket": "space_technology",
};

// ── Types ───────────────────────────────────────────────────────────────────

interface SafariHistoryEntry {
  url?: string;
  time_usec?: number;
  visit_count?: number;
  title?: string;
  destination_url?: string;
  destination_time_usec?: number;
}

interface SafariMetadata {
  browser_name?: string;
  browser_version?: string;
  data_type?: string;
  export_time_usec?: number;
  schema_version?: unknown;
}

export interface ParseResult {
  schemaVersion: number;
  totalVisits: number;
  acceptedVisits: number;
  rejectedVisits: number;
  topDomains: Array<{ domain: string; count: number }>;
  topicCounts: Record<string, number>;
  dateRange: { start: string; end: string };
  stagedSignals: Array<{
    normalized_topic: string;
    weight: number;
    confidence: number;
    raw_value: string;
    observed_at: string;
    expires_at: string;
    source_reference: string;
  }>;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const INTERNAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function isLocalhost(hostname: string): boolean {
  return INTERNAL_HOSTS.has(hostname) || hostname.endsWith(".local");
}

function extractDomain(url: string): string | null {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function isValidUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function isInferredTopic(topic: string): topic is TopicTaxonomy {
  const topics: readonly string[] = Object.keys(TOPIC_DISPLAY_NAMES);
  return topics.includes(topic);
}

function inferTopics(url: string, title?: string): TopicTaxonomy[] {
  const domain = extractDomain(url)?.toLowerCase();
  const domains = domain ? DOMAIN_TOPIC_MAP[domain] : null;
  const titleMatches: TopicTaxonomy[] = [];
  const titleLower = title?.toLowerCase() ?? "";
  for (const [keyword, topic] of Object.entries(TITLE_KEYWORD_MAP)) {
    if (titleLower.includes(keyword)) {
      titleMatches.push(topic);
    }
  }
  return [...new Set([...(domains ?? []), ...titleMatches])];
}

// ── Streaming ZIP extraction (+ streaming JSON parse) ───────────────────────

/**
 * Extract History.json from a ZIP via yauzl, then immediately pipe it
 * through json-streamer to parse individual history entries one by one,
 * never buffering the full JSON payload.
 */
async function processZipViaStream(
  zipPath: string,
  onEntry: (entry: SafariHistoryEntry) => void,
  onSchemaVersion: (sv: unknown) => void
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    yauzl.open(
      zipPath,
      { lazyEntries: true, validateEntrySizes: true },
      (openErr, zipfile) => {
        if (openErr || !zipfile) {
          reject(openErr ?? new Error("Failed to open ZIP archive"));
          return;
        }

        let settled = false;
        const finish = (err?: Error) => {
          if (settled) return;
          settled = true;
          zipfile.close();
          if (err) reject(err);
          else resolve();
        };

        zipfile.on("error", (err) => finish(err));
        zipfile.on("end", () =>
          finish(new Error("History.json not found in archive"))
        );
        zipfile.on("entry", (entry: Entry) => {
          if (settled) return;

          const normalizedName = entry.fileName.replace(/\\/g, "/");
          if (normalizedName.startsWith("__MACOSX/")) {
            zipfile.readEntry();
            return;
          }
          if (path.posix.basename(normalizedName) !== "History.json") {
            zipfile.readEntry();
            return;
          }

          zipfile.openReadStream(entry, (streamErr, entryStream) => {
            if (streamErr || !entryStream) {
              finish(
                streamErr ?? new Error("Failed to open History.json stream")
              );
              return;
            }

            // First pass: extract schema_version via stream-json pick
            const schemaStream = entryStream
              .pipe(createJSONParser())
              .pipe(pick({ filter: "metadata" }))
              .pipe(streamValues());

            let metadataSeen = false;
            schemaStream.on("data", ({ value }) => {
              const meta = value as SafariMetadata | undefined;
              if (meta) {
                onSchemaVersion(meta.schema_version);
                metadataSeen = true;
              }
            });
            schemaStream.on("error", () => {
              // Expected after we consume metadata — move on
            });

            // After a short tick, set up the second stream for history array
            // We re-open the ZIP entry for the history pass.
            setTimeout(() => {
              zipfile.openReadStream(entry, (err2, entryStream2) => {
                if (err2 || !entryStream2) {
                  finish(
                    err2 ?? new Error("Failed to open History.json stream (2)")
                  );
                  return;
                }

                const historyStream = entryStream2
                  .pipe(createJSONParser())
                  .pipe(pick({ filter: "history" }))
                  .pipe(streamArray());

                historyStream.on("data", ({ value }) => {
                  onEntry(value as SafariHistoryEntry);
                });
                historyStream.on("error", (err3) => finish(err3 as Error));
                historyStream.on("end", () => finish());
              });
            }, 0);
          });
        });

        zipfile.readEntry();
      }
    );
  });
}

// ── Main parser ─────────────────────────────────────────────────────────────
//
// Streaming requirement satisfied end-to-end:
// - ZIP is never fully buffered. yauzl streams individual entry data.
// - History.json is streamed via `stream-json` (pick + streamArray).
//   Each history entry is processed individually — the full JSON array
//   is never materialized as a JS object graph.
//
// Architecture:
//   Upload Readable → disk (pipeline) → yauzl streams entry →
//   stream-json parse → per-entry processing → cleanup

export async function parseSafariHistoryZip(
  stream: Readable,
  importId: string
): Promise<ParseResult> {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "ai-news-safari-import-"));
  const zipPath = path.join(tempDir, `${importId}.zip`);

  try {
    // Step 1: Stream the upload ZIP to disk (back-pressured, never buffered)
    await pipeline(stream, createWriteStream(zipPath));

    // Step 2: Streaming JSON parse — schema version + history entries, one at a time
    let schemaVersion: unknown;
    const cutoffDate = new Date(
      Date.now() - HISTORY_IMPORT_MAX_AGE_DAYS * 24 * 60 * 60 * 1_000
    );
    const domainCounts: Record<string, number> = {};
    const topicCounts: Record<string, number> = {};
    const perDomainTopics: Record<string, Record<string, number>> = {};
    const dedupeKeys = new Set<string>();
    let totalVisits = 0;
    let acceptedVisits = 0;
    let rejectedVisits = 0;
    let earliestDate: Date | null = null;
    let latestDate: Date | null = null;

    await processZipViaStream(
      zipPath,
      (entry) => {
        // Processing each entry as it's streamed
        totalVisits++;
        const canonicalUrl = entry.destination_url || entry.url;
        const timeUsec = entry.destination_time_usec || entry.time_usec;

        if (!canonicalUrl || !isValidUrl(canonicalUrl)) {
          rejectedVisits++;
          return;
        }

        const domain = extractDomain(canonicalUrl);
        if (!domain || isLocalhost(domain)) {
          rejectedVisits++;
          return;
        }

        const visitTime = new Date((timeUsec ?? 0) / 1_000);
        if (Number.isNaN(visitTime.getTime()) || visitTime < cutoffDate) {
          rejectedVisits++;
          return;
        }

        const day = visitTime.toISOString().split("T")[0];
        const dedupeKey = `${canonicalUrl}|${day}`;
        if (dedupeKeys.has(dedupeKey)) {
          rejectedVisits++;
          return;
        }
        dedupeKeys.add(dedupeKey);

        acceptedVisits++;
        if (!earliestDate || visitTime < earliestDate) earliestDate = visitTime;
        if (!latestDate || visitTime > latestDate) latestDate = visitTime;

        domainCounts[domain] = (domainCounts[domain] ?? 0) + 1;

        const topics = inferTopics(canonicalUrl, entry.title);
        for (const topic of topics) {
          topicCounts[topic] = (topicCounts[topic] ?? 0) + 1;
          if (!perDomainTopics[domain]) perDomainTopics[domain] = {};
          perDomainTopics[domain][topic] =
            (perDomainTopics[domain][topic] ?? 0) + 1;
        }
      },
      (sv) => {
        schemaVersion = sv;
      }
    );

    // Validate schema version
    if (typeof schemaVersion !== "number" || schemaVersion !== 1) {
      const err = new Error(
        `Unknown schema version: ${JSON.stringify(schemaVersion)}`
      );
      (err as Error & { schemaVersion: unknown }).schemaVersion =
        schemaVersion;
      throw err;
    }

    // Top 20 domains
    const topDomains = Object.entries(domainCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([d, c]) => ({ domain: d, count: c }));

    // Build staged signals: per domain-topic pair, weight capped
    // The spec requirement: "imported history cannot overpower explicit
    // preferences." We enforce this by capping each domain's TOTAL
    // contribution across all its inferred topics, then distributing evenly.
    const stagedSignals: ParseResult["stagedSignals"] = [];
    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + HISTORY_IMPORT_MAX_AGE_DAYS * 24 * 60 * 60 * 1_000
    );

    // Per-domain total weight is the sum of all its topic-topic-pair weights.
    // First compute per-domain raw score, then apply the cap to the domain total.
    const domainRawScores: Record<string, number> = {};
    type PendingSignal = {
      topic: string;
      rawCount: number;
      domain: string;
    };
    const pendingSignals: PendingSignal[] = [];

    for (const [domain, topics] of Object.entries(perDomainTopics)) {
      for (const [topic, rawCount] of Object.entries(topics)) {
        pendingSignals.push({ topic, rawCount, domain });
        domainRawScores[domain] =
          (domainRawScores[domain] ?? 0) + rawCount * 0.01;
      }
    }

    // Cap each domain's total contribution, then distribute proportionally
    // among its topic pairs (preserving relative importance within the domain)
    for (const { topic, rawCount, domain } of pendingSignals) {
      const domainTotalRaw = domainRawScores[domain];
      // Proportion of this pair within the domain's raw score
      const pairFraction = (rawCount * 0.01) / (domainTotalRaw || 1);
      // Domain's final capped total, distributed by fraction
      const cappedDomainTotal = Math.min(
        domainTotalRaw,
        HISTORY_IMPORT_DOMAIN_WEIGHT_CAP
      );
      const weight = Math.max(0.01, pairFraction * cappedDomainTotal);

      stagedSignals.push({
        normalized_topic: topic,
        weight,
        confidence: 0.5,
        raw_value: domain,
        observed_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        source_reference: `history_import:${importId}:${domain}`,
      });
    }

    return {
      schemaVersion: 1,
      totalVisits,
      acceptedVisits,
      rejectedVisits,
      topDomains,
      topicCounts,
      dateRange: {
        start: (earliestDate as Date | null)?.toISOString() ?? "",
        end: (latestDate as Date | null)?.toISOString() ?? "",
      },
      stagedSignals,
    };
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}
