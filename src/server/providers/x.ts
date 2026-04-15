import { db } from "@/server/db/client";
import { encrypt } from "@/server/crypto";
import { TOPIC_TAXONOMY } from "@/server/taxonomy";

/**
 * X (Twitter) provider — token management, API fetches, and signal normalization.
 *
 * Token refresh: When a 401 is encountered, we attempt to refresh the access token
 * using the stored refresh_token. After consecutive failures we disable the account.
 */

// ---------- Keyword -> topic maps ------------------------------------------

const KEYWORD_TOPIC_MAP: Record<string, (typeof TOPIC_TAXONOMY)[number]> = {
  // artificial_intelligence
  ai: "artificial_intelligence",
  "artificial intelligence": "artificial_intelligence",
  gpt: "artificial_intelligence",
  chatgpt: "artificial_intelligence",
  llm: "artificial_intelligence",
  "language model": "artificial_intelligence",
  claude: "artificial_intelligence",
  gemini: "artificial_intelligence",
  copilot: "artificial_intelligence",
  "generative ai": "artificial_intelligence",
  openai: "artificial_intelligence",
  anthropic: "artificial_intelligence",
  mistral: "artificial_intelligence",

  // machine_learning
  "machine learning": "machine_learning",
  ml: "machine_learning",
  "neural network": "machine_learning",
  "deep learning": "machine_learning",
  "training data": "machine_learning",
  "model training": "machine_learning",
  "reinforcement learning": "machine_learning",
  transformer: "machine_learning",
  bert: "machine_learning",
  embedding: "machine_learning",
  "fine-tuned": "machine_learning",
  "fine tuning": "machine_learning",

  // computer_vision
  "computer vision": "computer_vision",
  cv: "computer_vision",
  "image recognition": "computer_vision",
  "object detection": "computer_vision",

  // robotics_automation
  robotics: "robotics_automation",
  automation: "robotics_automation",
  drone: "robotics_automation",
  autonomous: "robotics_automation",

  // cybersecurity
  security: "cybersecurity",
  hack: "cybersecurity",
  breach: "cybersecurity",
  malware: "cybersecurity",
  ransomware: "cybersecurity",
  exploit: "cybersecurity",
  vulnerability: "cybersecurity",
  zero_day: "cybersecurity",
  "zero-day": "cybersecurity",
  phishing: "cybersecurity",
  encryption: "cybersecurity",
  firewall: "cybersecurity",
  pentest: "cybersecurity",

  // developer_tools
  coding: "developer_tools",
  developer: "developer_tools",
  code: "developer_tools",
  api: "developer_tools",
  sdk: "developer_tools",
  programming: "developer_tools",
  "open source": "developer_tools",
  github: "developer_tools",
  gitlab: "developer_tools",
  "software engineering": "developer_tools",
  devtools: "developer_tools",
  vscode: "developer_tools",
  "vs_code": "developer_tools",
  npm: "developer_tools",

  // startups_venture
  startup: "startups_venture",
  funding: "startups_venture",
  series: "startups_venture",
  unicorn: "startups_venture",
  vc: "startups_venture",
  seed: "startups_venture",
  accelerator: "startups_venture",
  "venture capital": "startups_venture",
  yc: "startups_venture",
  "y_combinator": "startups_venture",
  ycombinator: "startups_venture",
  "pitch deck": "startups_venture",
  "series a": "startups_venture",
  "series b": "startups_venture",
  "series c": "startups_venture",
  ipo: "startups_venture",

  // consumer_tech (big tech companies)
  google: "consumer_tech",
  microsoft: "consumer_tech",
  meta: "consumer_tech",
  amazon: "consumer_tech",
  apple: "consumer_tech",
  alphabet: "consumer_tech",
  tesla: "consumer_tech",
  netflix: "consumer_tech",
  nvidia: "consumer_tech",
  smartphone: "consumer_tech",
  iphone: "consumer_tech",
  android: "consumer_tech",
  gadget: "consumer_tech",

  // cloud_computing
  cloud: "cloud_computing",
  aws: "cloud_computing",
  azure: "cloud_computing",
  gcp: "cloud_computing",
  kubernetes: "cloud_computing",
  serverless: "cloud_computing",
  docker: "cloud_computing",
  terraform: "cloud_computing",

  // data_science_analytics
  analytics: "data_science_analytics",
  "data science": "data_science_analytics",
  big_data: "data_science_analytics",
  "data engineering": "data_science_analytics",
  "business intelligence": "data_science_analytics",
  tableau: "data_science_analytics",
  looker: "data_science_analytics",

  // blockchain_crypto
  blockchain: "blockchain_crypto",
  crypto: "blockchain_crypto",
  bitcoin: "blockchain_crypto",
  ethereum: "blockchain_crypto",
  nft: "blockchain_crypto",
  defi: "blockchain_crypto",

  // quantum_computing
  quantum: "quantum_computing",
  qubit: "quantum_computing",

  // semiconductors_hardware
  semiconductor: "semiconductors_hardware",
  chip: "semiconductors_hardware",
  gpu: "semiconductors_hardware",
  tsmc: "semiconductors_hardware",
  intel: "semiconductors_hardware",

  // healthcare_biotech
  healthcare: "healthcare_biotech",
  biotech: "healthcare_biotech",
  genomics: "healthcare_biotech",
  drug: "healthcare_biotech",

  // climate_energy
  climate: "climate_energy",
  renewable: "climate_energy",
  solar: "climate_energy",
  ev: "climate_energy",
  electric_vehicle: "climate_energy",

  // space_technology
  space: "space_technology",
  rocket: "space_technology",
  mars: "space_technology",
  spacex: "space_technology",

  // tech_policy_regulation
  regulation: "tech_policy_regulation",
  policy: "tech_policy_regulation",
  gdpr: "tech_policy_regulation",
  antitrust: "tech_policy_regulation",
  ftc: "tech_policy_regulation",

  // natural_language_processing
  nlp: "natural_language_processing",
  "natural language": "natural_language_processing",
  "text generation": "natural_language_processing",
  sentiment: "natural_language_processing",
};

/**
 * Extracts topic matches from a piece of text.
 * Returns a deduplicated array of topic strings found.
 */
export function extractTopics(text: string | null | undefined): string[] {
  if (!text) return [];
  const lower = text.toLowerCase();
  const found = new Set<string>();
  for (const [keyword, topic] of Object.entries(KEYWORD_TOPIC_MAP)) {
    if (lower.includes(keyword)) {
      found.add(topic);
    }
  }
  return Array.from(found);
}

// ---------- Token helpers -------------------------------------------------

/**
 * Refresh X access token using stored refresh_token.
 * Updates the linked_accounts row with new tokens.
 * Returns the new decrypted access_token, or throws on failure.
 */
async function refreshXToken(accountId: number): Promise<string> {
  const { decrypt } = await import("@/server/crypto");
  const account = await db.linked_accounts.findUnique({
    where: { id: accountId },
  });

  if (!account?.refresh_token_encrypted) {
    throw new Error("No refresh token available for X account");
  }

  const refreshToken = await decrypt(account.refresh_token_encrypted);
  const clientId = process.env.X_CLIENT_ID!;
  const clientSecret = process.env.X_CLIENT_SECRET!;

  const resp = await fetch("https://api.x.com/2/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization:
        "Basic " +
        Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    console.error("X token refresh failed:", errText);
    throw new Error(`X token refresh failed: ${resp.status} ${errText}`);
  }

  const tokens = await resp.json();
  const { access_token, refresh_token: newRefreshToken, expires_in } = tokens;

  const accessTokenEncrypted = await encrypt(access_token);
  let refreshTokenEncrypted = account.refresh_token_encrypted;
  if (newRefreshToken) {
    refreshTokenEncrypted = await encrypt(newRefreshToken);
  }

  await db.linked_accounts.update({
    where: { id: accountId },
    data: {
      access_token_encrypted: accessTokenEncrypted,
      refresh_token_encrypted: refreshTokenEncrypted,
      expires_at: new Date(Date.now() + (expires_in ?? 7200) * 1000),
    },
  });

  return access_token;
}

/**
 * Get a valid X access token for the user.
 * Refreshes if the current token is expired.
 */
export async function getXAccessToken(userId: string): Promise<string> {
  const { decrypt } = await import("@/server/crypto");
  const accountId = await getXAccountId(userId);

  const account = await db.linked_accounts.findUnique({
    where: { id: accountId },
  });

  if (!account) {
    throw new Error(`No X account linked for user ${userId}`);
  }

  if (!account.access_token_encrypted) {
    throw new Error("No access token stored for X account");
  }

  // Check if token is expired (with 5 min buffer)
  if (
    account.expires_at &&
    account.expires_at.getTime() < Date.now() + 5 * 60 * 1000
  ) {
    if (account.refresh_token_encrypted) {
      return refreshXToken(accountId);
    }
    // Token expired but no refresh token - mark as invalid
    await db.linked_accounts.update({
      where: { id: accountId },
      data: {
        status: "disabled",
        sync_error_code: "token_expired",
        sync_error_at: new Date(),
      },
    });
    throw new Error(
      "X access token expired and no refresh token available",
    );
  }

  return decrypt(account.access_token_encrypted);
}

/**
 * Get the X linked_account ID for a user.
 */
async function getXAccountId(userId: string): Promise<number> {
  const account = await db.linked_accounts.findFirst({
    where: { user_id: userId, provider: "x", status: "active" },
    select: { id: true },
  });
  if (!account) {
    throw new Error(`No active X account linked for user ${userId}`);
  }
  return account.id;
}

/**
 * Handle a 401 from X API: attempt token refresh, re-throw on failure.
 */
export async function handleX401(userId: string): Promise<string> {
  const accountId = await getXAccountId(userId);
  try {
    return await refreshXToken(accountId);
  } catch (err) {
    // Mark the account as having a token error
    await db.linked_accounts.update({
      where: { id: accountId },
      data: {
        sync_error_code: "token_expired",
        sync_error_at: new Date(),
      },
    });
    throw err;
  }
}

// ---------- API fetches ---------------------------------------------------

/**
 * Fetch accounts the user follows on X.
 * Returns normalized interest signals.
 */
export async function fetchXFollows(
  userId: string,
): Promise<{ topic: string; entity: string; raw: string }[]> {
  const accessToken = await getXAccessToken(userId);
  const allFollows: { topic: string; entity: string; raw: string }[] = [];

  // Fetch follows (paginated, up to 1000)
  let url: string | null =
    "https://api.x.com/2/users/@me/following?user.fields=id,name,username,description&max_results=100";
  while (url) {
    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (resp.status === 401) {
      await handleX401(userId); // attempt refresh
      const newToken = await getXAccessToken(userId);
      const retryResp = await fetch(url, {
        headers: { Authorization: `Bearer ${newToken}` },
      });
      if (!retryResp.ok) break;
      const data = await retryResp.json() as Record<string, unknown>;
      processXEntities((data.data as Record<string, unknown>[] ?? []), allFollows);
      const meta = data.meta as Record<string, unknown> | undefined;
      url = meta?.next_token
        ? `https://api.x.com/2/users/@me/following?user.fields=id,name,username,description&max_results=100&pagination_token=${meta.next_token}`
        : null;
      continue;
    }

    if (!resp.ok) break;
    const data = await resp.json() as Record<string, unknown>;
    processXEntities((data.data as Record<string, unknown>[] ?? []), allFollows);
    const meta = data.meta as Record<string, unknown> | undefined;
    url = meta?.next_token
      ? `https://api.x.com/2/users/@me/following?user.fields=id,name,username,description&max_results=100&pagination_token=${meta.next_token}`
      : null;
  }

  return allFollows;
}

function processXEntities(
  entities: Array<{
    id?: string;
    name?: string;
    username?: string;
    description?: string;
  }>,
  results: { topic: string; entity: string; raw: string }[],
): void {
  for (const e of entities) {
    const text = [e.name, e.username, e.description]
      .filter(Boolean)
      .join(" ");
    const topics = extractTopics(text);
    for (const topic of topics) {
      results.push({
        topic,
        entity: e.name ?? e.username ?? e.id ?? "",
        raw: text,
      });
    }
  }
}

/**
 * Fetch liked tweets from X API.
 */
export async function fetchXLikes(
  userId: string,
): Promise<{ text: string; tweet_id: string }[]> {
  const accessToken = await getXAccessToken(userId);
  const allLikes: { text: string; tweet_id: string }[] = [];

  let url: string | null =
    "https://api.x.com/2/users/@me/liked_tweets?max_results=100&tweet.fields=text,created_at";
  while (url) {
    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (resp.status === 401) {
      await handleX401(userId);
      const newToken = await getXAccessToken(userId);
      const retryResp = await fetch(url, {
        headers: { Authorization: `Bearer ${newToken}` },
      });
      if (!retryResp.ok) break;
      const data = await retryResp.json() as Record<string, unknown>;
      extractTweets((data.data as Record<string, unknown>[] ?? []), allLikes);
      const meta = data.meta as Record<string, unknown> | undefined;
      url = meta?.next_token
        ? `https://api.x.com/2/users/@me/liked_tweets?max_results=100&tweet.fields=text,created_at&pagination_token=${meta.next_token}`
        : null;
      continue;
    }

    if (!resp.ok) break;
    const data = await resp.json() as Record<string, unknown>;
    extractTweets((data.data as Record<string, unknown>[] ?? []), allLikes);
    const meta = data.meta as Record<string, unknown> | undefined;
    url = meta?.next_token
      ? `https://api.x.com/2/users/@me/liked_tweets?max_results=100&tweet.fields=text,created_at&pagination_token=${meta.next_token}`
      : null;
  }

  return allLikes.slice(0, 500); // cap to avoid excessive writes
}

/**
 * Fetch bookmarks from X API.
 */
export async function fetchXBookmarks(
  userId: string,
): Promise<{ text: string; tweet_id: string }[]> {
  const accessToken = await getXAccessToken(userId);
  const allBookmarks: { text: string; tweet_id: string }[] = [];

  let url: string | null =
    "https://api.x.com/2/users/@me/bookmarks?max_results=100&tweet.fields=text,created_at";
  while (url) {
    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (resp.status === 401) {
      await handleX401(userId);
      const newToken = await getXAccessToken(userId);
      const retryResp = await fetch(url, {
        headers: { Authorization: `Bearer ${newToken}` },
      });
      if (!retryResp.ok) break;
      const data = await retryResp.json() as Record<string, unknown>;
      extractTweets((data.data as Record<string, unknown>[] ?? []), allBookmarks);
      const meta = data.meta as Record<string, unknown> | undefined;
      url = meta?.next_token
        ? `https://api.x.com/2/users/@me/bookmarks?max_results=100&tweet.fields=text,created_at&pagination_token=${meta.next_token}`
        : null;
      continue;
    }

    if (!resp.ok) break;
    const data = await resp.json() as Record<string, unknown>;
    extractTweets((data.data as Record<string, unknown>[] ?? []), allBookmarks);
    const meta = data.meta as Record<string, unknown> | undefined;
    url = meta?.next_token
      ? `https://api.x.com/2/users/@me/bookmarks?max_results=100&tweet.fields=text,created_at&pagination_token=${meta.next_token}`
      : null;
  }

  return allBookmarks.slice(0, 500);
}

function extractTweets(
  tweets: Array<{ id?: string; text?: string }>,
  results: { text: string; tweet_id: string }[],
): void {
  for (const t of tweets) {
    if (t.text) {
      results.push({
        text: t.text,
        tweet_id: t.id ?? "",
      });
    }
  }
}

// ---------- Signal normalization and persistence --------------------------

interface XSignal {
  topic: string;
  provider: string;
  signal_type: string;
  raw_value: string;
  entity: string | null;
  weight: number;
  confidence: number;
  source_reference: string | null;
}

/**
 * Write normalized X signals to the interest_signals table.
 * Uses upsert keyed on the first matching row.
 */
export async function normalizeXSignals(
  userId: string,
  signals: XSignal[],
): Promise<number> {
  if (signals.length === 0) return 0;

  let written = 0;
  for (const s of signals) {
    const existing = await db.interest_signals.findFirst({
      where: {
        user_id: userId,
        provider: s.provider,
        signal_type: s.signal_type,
        raw_value: s.raw_value,
      },
      select: { id: true },
    });

    if (existing) {
      await db.interest_signals.update({
        where: { id: existing.id },
        data: {
          normalized_topic: s.topic,
          weight: s.weight,
          confidence: s.confidence,
          observed_at: new Date(),
          signal_strength_bucket: Math.round(
            Math.min(5, Math.max(0, s.weight * 5)),
          ),
        },
      });
    } else {
      await db.interest_signals.create({
        data: {
          user_id: userId,
          provider: s.provider,
          signal_type: s.signal_type,
          raw_value: s.raw_value,
          normalized_topic: s.topic,
          entity: s.entity,
          weight: s.weight,
          confidence: s.confidence,
          source_reference: s.source_reference,
          observed_at: new Date(),
          signal_strength_bucket: Math.round(
            Math.min(5, Math.max(0, s.weight * 5)),
          ),
        },
      });
    }
    written++;
  }

  return written;
}

/**
 * Record a sync failure on the linked_accounts table.
 * Increments the failure count; if >= CONSECUTIVE_FAILURE_LIMIT, disables the account.
 */
export async function recordSyncFailure(
  userId: string,
  provider: string,
  errorCode: string,
): Promise<void> {
  const account = await db.linked_accounts.findFirst({
    where: { user_id: userId, provider, status: "active" },
  });
  if (!account) return;

  const newCount = (account.sync_failure_count ?? 0) + 1;
  const CONSECUTIVE_FAILURE_LIMIT = 3;

  await db.linked_accounts.update({
    where: { id: account.id },
    data: {
      sync_error_code: errorCode,
      sync_error_at: new Date(),
      sync_failure_count: newCount,
      status: newCount >= CONSECUTIVE_FAILURE_LIMIT ? "disabled" : account.status,
    },
  });
}

/**
 * Reset the failure count on a successful sync.
 */
export async function resetSyncFailure(
  userId: string,
  provider: string,
): Promise<void> {
  const account = await db.linked_accounts.findFirst({
    where: { user_id: userId, provider },
  });
  if (!account) return;
  await db.linked_accounts.update({
    where: { id: account.id },
    data: { sync_failure_count: 0, sync_error_code: null },
  });
}
