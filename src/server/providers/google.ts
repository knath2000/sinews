import { db } from "@/server/db/client";
import { encrypt } from "@/server/crypto";
import { TOPIC_TAXONOMY } from "@/server/taxonomy";
import { extractTopics, recordSyncFailure, resetSyncFailure } from "./x";

/**
 * Google provider — token management, People API profile fetch, signal normalization.
 */

// ---------- Token helpers -------------------------------------------------

/**
 * Refresh Google access token using stored refresh_token.
 * Updates the linked_accounts row with new tokens.
 */
async function refreshGoogleToken(accountId: number): Promise<string> {
  const { decrypt } = await import("@/server/crypto");
  const account = await db.linked_accounts.findUnique({
    where: { id: accountId },
  });

  if (!account?.refresh_token_encrypted) {
    throw new Error("No refresh token available for Google account");
  }

  const refreshToken = await decrypt(account.refresh_token_encrypted);
  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;

  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    console.error("Google token refresh failed:", errText);
    throw new Error(
      `Google token refresh failed: ${resp.status} ${errText}`,
    );
  }

  const tokens = await resp.json();
  const { access_token, expires_in } = tokens;

  const accessTokenEncrypted = await encrypt(access_token);

  await db.linked_accounts.update({
    where: { id: accountId },
    data: {
      access_token_encrypted: accessTokenEncrypted,
      expires_at: new Date(Date.now() + (expires_in ?? 3600) * 1000),
    },
  });

  return access_token;
}

/**
 * Get a valid Google access token for the user.
 * Refreshes if the current token is expired.
 */
export async function getGoogleAccessToken(userId: string): Promise<string> {
  const { decrypt } = await import("@/server/crypto");
  const account = await getGoogleAccount(userId);

  if (!account.access_token_encrypted) {
    throw new Error("No access token stored for Google account");
  }

  // Check if token is expired (with 5 min buffer)
  if (
    account.expires_at &&
    account.expires_at.getTime() < Date.now() + 5 * 60 * 1000
  ) {
    if (account.refresh_token_encrypted) {
      return refreshGoogleToken(account.id);
    }
    await db.linked_accounts.update({
      where: { id: account.id },
      data: {
        status: "disabled",
        sync_error_code: "token_expired",
        sync_error_at: new Date(),
      },
    });
    throw new Error(
      "Google access token expired and no refresh token available",
    );
  }

  return decrypt(account.access_token_encrypted);
}

async function getGoogleAccount(userId: string) {
  const account = await db.linked_accounts.findFirst({
    where: { user_id: userId, provider: "google", status: "active" },
  });
  if (!account) {
    throw new Error(`No active Google account linked for user ${userId}`);
  }
  return account;
}

/**
 * Handle a 401 from Google API: attempt token refresh, re-throw on failure.
 */
export async function handleGoogle401(userId: string): Promise<string> {
  const account = await getGoogleAccount(userId);
  try {
    return await refreshGoogleToken(account.id);
  } catch (err) {
    await db.linked_accounts.update({
      where: { id: account.id },
      data: {
        sync_error_code: "token_expired",
        sync_error_at: new Date(),
      },
    });
    throw err;
  }
}

// ---------- API fetches ---------------------------------------------------

interface GoogleProfile {
  email?: string;
  displayName?: string;
  organizations?: Array<{
    name?: string;
    title?: string;
    primary: boolean;
    department?: string;
  }>;
  languages?: { value?: string }[];
}

/**
 * Fetch Google profile via People API (OAuth2 userinfo + People API).
 * Returns organization and language data used for signal extraction.
 */
export async function fetchGoogleProfile(
  userId: string,
): Promise<GoogleProfile> {
  const accessToken = await getGoogleAccessToken(userId);

  // Fetch basic profile info
  const profileResp = await fetch(
    "https://people.googleapis.com/v1/people/me?personFields=names,emailAddresses,organizations,locales,languages",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (profileResp.status === 401) {
    await handleGoogle401(userId);
    const newToken = await getGoogleAccessToken(userId);
    const retryResp = await fetch(
      "https://people.googleapis.com/v1/people/me?personFields=names,emailAddresses,organizations,locales,languages",
      {
        headers: { Authorization: `Bearer ${newToken}` },
      },
    );
    if (!retryResp.ok) {
      const errText = await retryResp.text();
      throw new Error(
        `Google People API fetch failed: ${retryResp.status} ${errText}`,
      );
    }
    return parseProfile(await retryResp.json());
  }

  if (!profileResp.ok) {
    const errText = await profileResp.text();
    throw new Error(
      `Google People API fetch failed: ${profileResp.status} ${errText}`,
    );
  }

  return parseProfile(await profileResp.json());
}

function parseProfile(data: Record<string, unknown>): GoogleProfile {
  const profile: GoogleProfile = {};

  // Names
  const namesObj = data.names as Array<Record<string, unknown>> | undefined;
  const names = namesObj || [];
  const primaryName =
    names.find(
      (n: Record<string, unknown>) =>
        (n.metadata as Record<string, boolean> | undefined)?.primary,
    ) || names[0];
  if (primaryName?.displayName) {
    profile.displayName = primaryName.displayName as string;
  }

  // Emails
  const emailsObj = data.emailAddresses as
    | Array<Record<string, unknown>>
    | undefined;
  const emails = emailsObj || [];
  const primaryEmail =
    emails.find(
      (e: Record<string, unknown>) =>
        (e.metadata as Record<string, boolean> | undefined)?.primary,
    ) || emails[0];
  if (primaryEmail?.value) {
    profile.email = primaryEmail.value as string;
  }

  // Organizations
  const orgsObj = data.organizations as
    | Array<Record<string, unknown>>
    | undefined;
  const orgs = orgsObj || [];
  profile.organizations = (
    orgs as Array<{
      name?: string;
      title?: string;
      primary?: boolean;
      department?: string;
    }>
  ).map((o) => ({
    name: o.name,
    title: o.title,
    primary: o.primary ?? false,
    department: o.department,
  }));

  // Languages
  const langsObj = data.languages as
    | Array<Record<string, unknown>>
    | undefined;
  const langs = langsObj || [];
  profile.languages = (langs as Array<{ value?: string }>).map((l) => ({
    value: l.value,
  }));

  return profile;
}

// ---------- Signal normalization and persistence --------------------------

/**
 * Organization keyword -> topic mapping.
 * Maps known company names and org types to taxonomy topics.
 */
const ORG_TOPIC_MAP: Record<string, (typeof TOPIC_TAXONOMY)[number]> = {
  google: "consumer_tech",
  alphabet: "consumer_tech",
  microsoft: "consumer_tech",
  meta: "consumer_tech",
  amazon: "consumer_tech",
  apple: "consumer_tech",
  tesla: "consumer_tech",
  netflix: "consumer_tech",
  nvidia: "semiconductors_hardware",
  salesforce: "cloud_computing",
  oracle: "cloud_computing",
  ibm: "artificial_intelligence",
  intel: "semiconductors_hardware",
  amd: "semiconductors_hardware",
  tsmc: "semiconductors_hardware",
  openai: "artificial_intelligence",
  anthropic: "artificial_intelligence",
  deepmind: "artificial_intelligence",
  spacex: "space_technology",
  spacelabs: "space_technology",
  healthcare: "healthcare_biotech",
  hospital: "healthcare_biotech",
  pharma: "healthcare_biotech",
  university: "developer_tools",
  college: "developer_tools",
  startup: "startups_venture",
  incubator: "startups_venture",
  accelerator: "startups_venture",
  venture: "startups_venture",
  capital: "startups_venture",
  invest: "startups_venture",
};

/**
 * Writes normalized Google profile signals to the interest_signals table.
 * Extracts topics from organization names, department, title, and languages.
 */
export async function normalizeGoogleSignals(
  userId: string,
  profile: GoogleProfile,
): Promise<number> {
  const signals: Array<{
    topic: string;
    provider: string;
    signal_type: string;
    raw_value: string;
    entity: string | null;
    weight: number;
    confidence: number;
    source_reference: string | null;
  }> = [];

  // Organization signals
  if (profile.organizations && profile.organizations.length > 0) {
    for (const org of profile.organizations) {
      const orgText = [org.name, org.title, org.department]
        .filter(Boolean)
        .join(" ");
      const topics: string[] = extractTopics(orgText);

      // Also check ORG_TOPIC_MAP for org name
      if (org.name) {
        const mappedTopic = ORG_TOPIC_MAP[org.name.toLowerCase()];
        if (mappedTopic && !topics.includes(mappedTopic)) {
          topics.push(mappedTopic);
        }
      }

      // If no keyword matched topics, check org name keywords
      if (topics.length === 0 && org.name) {
        const name = org.name.toLowerCase();
        for (const [keyword, topic] of Object.entries(ORG_TOPIC_MAP)) {
          if (name.includes(keyword)) {
            topics.push(topic);
          }
        }
        // Default: if still no topic, skip this org
      }

      for (const topic of topics) {
        signals.push({
          topic,
          provider: "google",
          signal_type: "google_profile_org",
          raw_value: orgText,
          entity: org.name ?? null,
          weight: 0.5,
          confidence: 0.6,
          source_reference: org.title ?? null,
        });
      }
    }
  }

  // Language signals
  if (profile.languages && profile.languages.length > 0) {
    for (const lang of profile.languages) {
      if (lang.value) {
        const topics = extractTopics(lang.value);
        for (const topic of topics) {
          signals.push({
            topic,
            provider: "google",
            signal_type: "google_profile_language",
            raw_value: lang.value,
            entity: null,
            weight: 0.3,
            confidence: 0.4,
            source_reference: null,
          });
        }
      }
    }
  }

  // Email domain signal (company affiliation)
  if (profile.email) {
    const domain = profile.email.split("@")[1];
    if (
      domain &&
      domain !== "gmail.com" &&
      domain !== "yahoo.com"
    ) {
      const companyDomain = domain.replace(
        /\.(com|org|net|io|dev|co)$/i,
        "",
      );
      const orgTopics = extractTopics(companyDomain);
      const mappedTopic =
        ORG_TOPIC_MAP[companyDomain.toLowerCase()];
      if (mappedTopic && !orgTopics.includes(mappedTopic)) {
        orgTopics.push(mappedTopic);
      }

      for (const topic of orgTopics) {
        signals.push({
          topic,
          provider: "google",
          signal_type: "google_profile_email",
          raw_value: profile.email,
          entity: companyDomain,
          weight: 0.4,
          confidence: 0.5,
          source_reference: null,
        });
      }
    }
  }

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

// Re-export from x.ts so consumers don't need to import from there
export { recordSyncFailure, resetSyncFailure } from "./x";
