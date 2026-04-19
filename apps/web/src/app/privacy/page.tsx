import Link from "next/link";
import {
  CalendarDays,
  ChevronRight,
  Newspaper,
  ShieldCheck,
} from "lucide-react";
import { PageShell } from "@/components/page-shell";

export const metadata = {
  title: "Privacy Policy — AI News Brief",
  description:
    "Privacy policy for AI News Brief — how we collect, use, and protect your data.",
};

const sectionLinks = [
  { href: "#data-we-collect", label: "Data we collect" },
  { href: "#how-we-use-data", label: "How we use data" },
  { href: "#third-party-services", label: "Third-party services" },
  { href: "#data-retention", label: "Data retention" },
  { href: "#your-rights", label: "Your rights" },
  { href: "#oauth-scopes", label: "OAuth scopes" },
  { href: "#contact", label: "Contact" },
];

export default function PrivacyPage() {
  return (
    <PageShell
      shellClassName="lg:grid-cols-[270px_minmax(0,1fr)]"
      sidebar={
        <PrivacySidebar />
      }
    >
      {/* Hero */}
      <PrivacyHero />

      {/* Document panel */}
      <section
        className="rounded-[12px] border"
        style={{
          backgroundColor: "var(--ds-surface-1)",
          borderColor: "var(--ds-border)",
        }}
      >
        <article className="px-6 py-6 sm:px-8 sm:py-8">
          <div className="max-w-3xl space-y-8">
            <section>
              <p className="text-sm leading-relaxed" style={{ color: "var(--ds-text-muted)" }}>
                AI News Brief (&quot;we&quot;, &quot;our&quot;) respects your privacy and is
                committed to transparency about how we handle your data. This
                policy explains what we collect, why, and how you can control it.
              </p>
            </section>

            <section id="data-we-collect" className="scroll-mt-8">
              <h2 className="font-display text-xl font-semibold" style={{ color: "var(--ds-text)" }}>
                1. Data We Collect
              </h2>
              <div className="mt-3 space-y-2 text-sm leading-relaxed" style={{ color: "var(--ds-text-muted)" }}>
                <p><strong style={{ color: "var(--ds-text)" }}>Email address</strong> — Required for account creation and authentication via our magic-link login system.</p>
                <p><strong style={{ color: "var(--ds-text)" }}>Topic interests</strong> — Topics you select during onboarding and any manual adjustments you make in settings. These are used exclusively to personalize your daily briefing.</p>
                <p><strong style={{ color: "var(--ds-text)" }}>Linked account tokens</strong> — When you connect X / Twitter or Google accounts, we store OAuth access and refresh tokens, encrypted at rest using AES-256-GCM. We never store tokens in plaintext.</p>
                <p><strong style={{ color: "var(--ds-text)" }}>Reading feedback</strong> — Thumbs-up and thumbs-down signals you provide on articles in your briefing. These refine the ranking algorithm for future briefings.</p>
                <p><strong style={{ color: "var(--ds-text)" }}>Preference signals</strong> — Derived from your social graph: X accounts you follow, content you engage with, and Google profile interests. These feed into our interest inference system.</p>
              </div>
            </section>

            <section id="how-we-use-data" className="scroll-mt-8">
              <h2 className="font-display text-xl font-semibold" style={{ color: "var(--ds-text)" }}>
                2. How We Use Your Data
              </h2>
              <div className="mt-3 space-y-3 text-sm leading-relaxed" style={{ color: "var(--ds-text-muted)" }}>
                <p>
                  All data we collect serves a single purpose: to curate a
                  personalized daily briefing of AI and tech news that is relevant
                  to your interests. Specifically:
                </p>
                <ul className="list-disc space-y-1 pl-5" style={{ color: "var(--ds-text-muted)" }}>
                  <li>Your topic selections directly influence which articles are ranked higher in your daily brief.</li>
                  <li>Your linked account data (X follows, Google profile) helps us infer additional interests you haven&apos;t explicitly selected.</li>
                  <li>Your feedback (thumbs up/down) adjusts the weights of topics and entities for future briefings.</li>
                  <li>Your timezone determines when your daily briefing is generated and ready.</li>
                </ul>
                <p>
                  We do not use your data for advertising, profiling beyond
                  personalization, or any purpose unrelated to the briefing
                  service. Your data is never sold, shared, or resold to third
                  parties.
                </p>
              </div>
            </section>

            <section id="third-party-services" className="scroll-mt-8">
              <h2 className="font-display text-xl font-semibold" style={{ color: "var(--ds-text)" }}>
                3. Third-Party Services
              </h2>
              <div className="mt-3 space-y-4 text-sm leading-relaxed" style={{ color: "var(--ds-text-muted)" }}>
                <p>We use the following third-party services to operate AI News Brief:</p>
                <div className="overflow-hidden rounded-[10px] border" style={{ borderColor: "var(--ds-border)" }}>
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ backgroundColor: "var(--ds-surface-2)" }}>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--ds-text-dim)" }}>
                          Service
                        </th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--ds-text-dim)" }}>
                          Purpose
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {thirdPartyServices.map((row) => (
                        <tr key={row.service} style={{ borderTop: "1px solid var(--ds-border)" }}>
                          <td className="px-4 py-2.5 font-medium" style={{ color: "var(--ds-text)" }}>{row.service}</td>
                          <td className="px-4 py-2.5" style={{ color: "var(--ds-text-muted)" }}>{row.purpose}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs" style={{ color: "var(--ds-text-dim)" }}>
                  Each third-party service is governed by its own privacy policy and terms of service. We only send the minimum data necessary for each service to function.
                </p>
              </div>
            </section>

            <section id="data-retention" className="scroll-mt-8">
              <h2 className="font-display text-xl font-semibold" style={{ color: "var(--ds-text)" }}>
                4. Data Retention
              </h2>
              <div className="mt-3 space-y-2 text-sm leading-relaxed" style={{ color: "var(--ds-text-muted)" }}>
                <p>We retain different types of data for different lengths of time:</p>
                <ul className="list-disc space-y-2 pl-5">
                  <li>
                    <strong style={{ color: "var(--ds-text)" }}>Raw social payloads</strong> — Raw data fetched from X and Google APIs are purged within 7 days. Only derived interest signals are retained.
                  </li>
                  <li>
                    <strong style={{ color: "var(--ds-text)" }}>Interest signals</strong> — Normalized interest signals (topic weights, entity affinities) are stored long-term to enable continuous personalization.
                  </li>
                  <li>
                    <strong style={{ color: "var(--ds-text)" }}>Article metadata</strong> — Articles in our shared pool are retained indefinitely for archival and deduplication purposes.
                  </li>
                  <li>
                    <strong style={{ color: "var(--ds-text)" }}>Daily briefs</strong> — Your generated briefs are kept for 30 days so you can review what you missed.
                  </li>
                  <li>
                    <strong style={{ color: "var(--ds-text)" }}>Feedback events</strong> — Thumbs-up/down events are retained for 90 days to inform ranking adjustments.
                  </li>
                </ul>
              </div>
            </section>

            <section id="your-rights" className="scroll-mt-8">
              <h2 className="font-display text-xl font-semibold" style={{ color: "var(--ds-text)" }}>
                5. Your Rights
              </h2>
              <div className="mt-3 space-y-2 text-sm leading-relaxed" style={{ color: "var(--ds-text-muted)" }}>
                <p>You have full control over your data at any time:</p>
                <ul className="list-disc space-y-2 pl-5">
                  <li><strong style={{ color: "var(--ds-text)" }}>Disconnect account</strong> — Purges all encrypted access and refresh tokens immediately.</li>
                  <li><strong style={{ color: "var(--ds-text)" }}>Delete your account</strong> — Permanently deletes your profile, linked accounts, topic preferences, daily briefs, interest signals, and feedback events. This action cannot be undone.</li>
                  <li><strong style={{ color: "var(--ds-text)" }}>Adjust topic preferences</strong> — Add or remove topics at any time from Settings.</li>
                  <li><strong style={{ color: "var(--ds-text)" }}>Data export</strong> — Contact us to request an export of your personal data.</li>
                </ul>
              </div>
            </section>

            <section id="oauth-scopes" className="scroll-mt-8">
              <h2 className="font-display text-xl font-semibold" style={{ color: "var(--ds-text)" }}>
                6. OAuth Scopes Requested
              </h2>
              <div className="mt-3 space-y-4 text-sm leading-relaxed" style={{ color: "var(--ds-text-muted)" }}>
                <p>When you link an account, we request the following OAuth scopes and explain exactly why:</p>
                <div className="overflow-hidden rounded-[10px] border" style={{ borderColor: "var(--ds-border)" }}>
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ backgroundColor: "var(--ds-surface-2)" }}>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--ds-text-dim)" }}>Provider</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--ds-text-dim)" }}>Scope</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--ds-text-dim)" }}>Why</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ borderTop: "1px solid var(--ds-border)" }}>
                        <td className="px-4 py-2.5 font-medium" style={{ color: "var(--ds-text)" }}>X / Twitter</td>
                        <td className="px-4 py-2.5">
                          <code className="rounded bg-[var(--ds-surface-2)] px-1.5 py-0.5 text-xs" style={{ color: "var(--ds-accent)" }}>tweet.read</code><br/>
                          <code className="rounded bg-[var(--ds-surface-2)] px-1.5 py-0.5 text-xs" style={{ color: "var(--ds-accent)" }}>users.read</code><br/>
                          <code className="rounded bg-[var(--ds-surface-2)] px-1.5 py-0.5 text-xs" style={{ color: "var(--ds-accent)" }}>follows.read</code>
                        </td>
                        <td className="px-4 py-2.5" style={{ color: "var(--ds-text-muted)" }}>
                          Read tweets you&apos;ve liked to infer interests; read accounts you follow for topic signals; read your basic profile for identity verification
                        </td>
                      </tr>
                      <tr style={{ borderTop: "1px solid var(--ds-border)" }}>
                        <td className="px-4 py-2.5 font-medium" style={{ color: "var(--ds-text)" }}>Google</td>
                        <td className="px-4 py-2.5">
                          <code className="rounded bg-[var(--ds-surface-2)] px-1.5 py-0.5 text-xs" style={{ color: "var(--ds-accent)" }}>.../auth/userinfo.profile</code><br/>
                          <code className="rounded bg-[var(--ds-surface-2)] px-1.5 py-0.5 text-xs" style={{ color: "var(--ds-accent)" }}>.../auth/userinfo.email</code>
                        </td>
                        <td className="px-4 py-2.5" style={{ color: "var(--ds-text-muted)" }}>
                          Read your display name and profile details for account linking and interest inference from your Google organization/domain
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="text-xs" style={{ color: "var(--ds-text-dim)" }}>
                  We never request scopes that allow posting, messaging, or any write access on your behalf. All requested scopes are read-only.
                </p>
              </div>
            </section>

            <section id="contact" className="scroll-mt-8">
              <h2 className="font-display text-xl font-semibold" style={{ color: "var(--ds-text)" }}>
                7. Contact
              </h2>
              <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--ds-text-muted)" }}>
                If you have questions or concerns about this Privacy Policy or our
                data practices, please reach out at{" "}
                <Link
                  href="mailto:privacy@ainewsbrief.com"
                  className="underline underline-offset-2 hover:opacity-80"
                  style={{ color: "var(--ds-accent)" }}
                >
                  privacy@ainewsbrief.com
                </Link>
                .
              </p>
            </section>
          </div>
        </article>
      </section>
    </PageShell>
  );
}

// ── Document page layout helpers ─────────────────────────────────

function PrivacySidebar() {
  return (
    <div className="hidden lg:block">
      <div
        className="sticky top-0 flex max-h-[calc(100vh-2rem)] flex-col gap-5 overflow-hidden rounded-[12px] border p-5"
        style={{
          backgroundColor: "var(--ds-surface-1)",
          borderColor: "var(--ds-border)",
        }}
      >
        <Link
          href="/"
          className="inline-flex items-center gap-3 transition-opacity hover:opacity-80"
        >
          <span
            className="inline-flex h-10 w-10 items-center justify-center rounded-[10px]"
            style={{ backgroundColor: "var(--ds-accent)" }}
          >
            <Newspaper className="h-5 w-5" style={{ color: "var(--ds-bg)" }} />
          </span>
          <div>
            <h2
              className="text-base font-semibold tracking-tight"
              style={{ color: "var(--ds-text)" }}
            >
              AI News Digest
            </h2>
            <p className="text-sm" style={{ color: "var(--ds-text-dim)" }}>Privacy policy</p>
          </div>
        </Link>

        <div
          className="rounded-[10px] border p-4"
          style={{
            backgroundColor: "var(--ds-surface-2)",
            borderColor: "var(--ds-border)",
          }}
        >
          <p
            className="text-[10px] font-semibold uppercase tracking-widest"
            style={{ color: "var(--ds-text-dim)" }}
          >
            Version 1.0
          </p>
          <p
            className="mt-1 text-xs"
            style={{ color: "var(--ds-text-muted)" }}
          >
            Last updated April 15, 2026
          </p>
        </div>

        <nav className="space-y-1">
          {sectionLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="group flex items-center justify-between rounded-[10px] px-3.5 py-2.5 text-sm transition-colors"
              style={{ color: "var(--ds-text-muted)" }}
            >
              <span>{link.label}</span>
              <ChevronRight className="h-4 w-4" style={{ opacity: 0.3 }} />
            </a>
          ))}
        </nav>

        <div
          className="mt-auto rounded-[10px] border p-4"
          style={{
            backgroundColor: "var(--ds-surface-2)",
            borderColor: "var(--ds-border)",
          }}
        >
          <div
            className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest"
            style={{ color: "var(--ds-text-dim)" }}
          >
            <CalendarDays className="h-3.5 w-3.5" style={{ color: "var(--ds-accent)" }} />
            Contact
          </div>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--ds-text-muted)" }}>
            Privacy questions, export requests, and deletion support.
          </p>
          <Link
            href="mailto:privacy@ainewsbrief.com"
            className="mt-3 inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-[var(--ds-accent-soft)]"
            style={{
              borderColor: "var(--ds-accent)",
              color: "var(--ds-accent)",
            }}
          >
            privacy@ainewsbrief.com
          </Link>
        </div>
      </div>
    </div>
  );
}

function PrivacyHero() {
  return (
    <section
      className="rounded-[12px] border px-6 py-6 sm:px-8 sm:py-8"
      style={{
        backgroundColor: "var(--ds-surface-1)",
        borderColor: "var(--ds-border)",
      }}
    >
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          <p
            className="font-body text-xs font-medium uppercase tracking-widest"
            style={{ color: "var(--ds-text-dim)" }}
          >
            Privacy policy
          </p>
          <h1
            className="font-display mt-2 text-[clamp(1.4rem,2.8vw,2rem)] font-semibold leading-[1.2] tracking-tight"
            style={{ color: "var(--ds-text)" }}
          >
            How we collect, use, and protect your data.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed" style={{ color: "var(--ds-text-muted)" }}>
            AI News Brief respects your privacy and keeps the product data
            model narrow: just enough information to personalize your daily
            briefing.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:w-[280px]">
          <MetricTile label="Retention" value="30–90" detail="for derived signals" />
          <MetricTile label="Contact" value="privacy@" detail="export and deletion" />
        </div>
      </div>
    </section>
  );
}

function MetricTile({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div
      className="rounded-[10px] border p-3"
      style={{
        backgroundColor: "var(--ds-surface-2)",
        borderColor: "var(--ds-border)",
      }}
    >
      <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--ds-text-dim)" }}>
        {label}
      </p>
      <p className="mt-1.5 text-lg font-semibold tracking-tight" style={{ color: "var(--ds-text)" }}>
        {value}
      </p>
      {detail && <p className="mt-0.5 text-[11px]" style={{ color: "var(--ds-text-dim)" }}>{detail}</p>}
    </div>
  );
}

const thirdPartyServices = [
  { service: "Supabase", purpose: "Authentication (magic-link login) and primary database hosting" },
  { service: "OpenAI", purpose: "AI summarization and recommendation scoring for article briefings" },
  { service: "TheNewsAPI", purpose: "News article sourcing and metadata retrieval" },
  { service: "X / Twitter API", purpose: "Reading your follows and engagement data (only with your explicit OAuth consent)" },
  { service: "Google People API", purpose: "Reading your Google profile information for interest inference (only with your explicit OAuth consent)" },
  { service: "Sentry", purpose: "Error monitoring and crash reporting for application reliability" },
];
