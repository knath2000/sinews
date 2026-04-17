import Link from "next/link";
import {
  CalendarDays,
  ChevronRight,
  Newspaper,
  ShieldCheck,
  Sparkles,
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
      sidebar={
        <div className="relative flex max-h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-[var(--radius-hero)] border border-[var(--glass-panel-border)] bg-[var(--glass-panel-bg)] p-5 shadow-[var(--shadow-hero)] backdrop-blur-[var(--glass-panel-blur)] lg:overflow-y-auto">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(251,146,60,0.10),_transparent_40%)]" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(56,189,248,0.07),_transparent_36%)]" />

          <div className="relative flex h-full flex-col">
            <div className="flex items-center justify-between gap-3">
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-sm font-semibold tracking-tight text-zinc-900 transition-transform hover:scale-[1.01]"
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-zinc-900 text-white shadow-lg shadow-zinc-900/15">
                  <Newspaper className="h-5 w-5" />
                </span>
                <span className="leading-tight">
                  AI News
                  <span className="block text-xs font-medium text-zinc-500">
                    Privacy policy
                  </span>
                </span>
              </Link>
              <span className="inline-flex items-center gap-1 rounded-full border border-white/80 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-zinc-500 shadow-sm">
                <ShieldCheck className="h-3.5 w-3.5 text-sky-500" />
                Policy
              </span>
            </div>

            <div
              className="mt-5 rounded-[1.5rem] border bg-gradient-to-br from-sky-50/60 to-transparent p-4 shadow-sm"
              style={{ borderColor: "rgba(56,189,248,0.15)" }}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-zinc-400">
                Overview
              </p>
              <div className="mt-3 flex items-end justify-between gap-4">
                <div>
                  <div className="text-3xl font-semibold tracking-tight text-zinc-900">
                    Version 1.0
                  </div>
                  <p className="mt-1 text-sm text-zinc-600">Last updated April 15, 2026</p>
                </div>
                <div className="rounded-2xl bg-white/60 px-3 py-2 text-right shadow-sm"
                  style={{ border: "1px solid rgba(255,255,255,0.75)" }}
                >
                  <div className="text-[11px] uppercase tracking-[0.3em] text-zinc-400">
                    Scope
                  </div>
                  <div className="mt-1 text-sm font-semibold text-zinc-800">
                    Personal data
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">briefing service</div>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-[1.5rem] border bg-white/60 p-4 shadow-sm"
              style={{ borderColor: "rgba(255,255,255,0.72)" }}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-zinc-400">
                Quick links
              </p>
              <div className="mt-3 space-y-2">
                {sectionLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    className="group flex items-center justify-between rounded-2xl border border-transparent bg-zinc-50/60 px-3 py-2 text-sm text-zinc-600 transition-all hover:border-white/80 hover:bg-white/90 hover:text-zinc-900 hover:shadow-sm"
                  >
                    <span>{link.label}</span>
                    <ChevronRight className="h-4 w-4 text-zinc-400 transition-transform group-hover:translate-x-0.5" />
                  </a>
                ))}
              </div>
            </div>

            <div className="mt-4 rounded-[1.5rem] border border-white/10 bg-zinc-900/95 p-4 text-white shadow-[0_24px_60px_-38px_rgba(15,23,42,0.5)]">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.35em] text-white/55">
                <CalendarDays className="h-3.5 w-3.5" />
                Contact
              </div>
              <p className="mt-3 text-sm leading-relaxed text-white/80">
                Privacy questions, export requests, and deletion support all
                route through a single contact path.
              </p>
              <Link
                href="mailto:privacy@ainewsbrief.com"
                className="mt-4 inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-2 text-xs font-medium text-white transition hover:bg-white/15"
              >
                privacy@ainewsbrief.com
              </Link>
            </div>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Hero */}
        <section className="motion-fade-up relative overflow-hidden rounded-[var(--radius-hero)] border border-[var(--glass-hero-border)] bg-[var(--glass-hero-bg)] shadow-[var(--shadow-hero)] backdrop-blur-[var(--glass-hero-blur)] px-6 py-8 sm:px-8 sm:py-10">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_70%_at_15%_5%,_rgba(56,189,248,0.10),_transparent)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_50%_at_85%_10%,_rgba(251,146,60,0.07),_transparent)]" />
          <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />

          <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.32em] text-zinc-500 shadow-sm">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                Privacy policy
              </div>
              <h1 className="mt-5 text-4xl font-semibold tracking-tight text-zinc-900 sm:text-5xl lg:text-6xl">
                How we collect, use, and protect your data.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-zinc-600 sm:text-lg">
                AI News Brief respects your privacy and keeps the product data
                model narrow: just enough information to personalize your daily
                briefing.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:w-[360px]">
              <div
                className="rounded-[1.75rem] border p-4 shadow-sm"
                style={{
                  background: "linear-gradient(145deg, rgba(255,255,255,0.88), rgba(255,255,255,0.60))",
                  borderColor: "rgba(56,189,248,0.14)",
                }}
              >
                <div className="text-[11px] font-semibold uppercase tracking-[0.35em] text-zinc-400">
                  Retention
                </div>
                <div className="mt-3 text-3xl font-semibold tracking-tight text-zinc-900">
                  30-90 days
                </div>
                <div className="mt-2 text-sm text-zinc-600">
                  for derived activity signals
                </div>
              </div>
              <div
                className="rounded-[1.75rem] border p-4 shadow-sm"
                style={{
                  background: "linear-gradient(145deg, rgba(56,189,248,0.10), rgba(251,146,60,0.06))",
                  borderColor: "rgba(56,189,248,0.16)",
                }}
              >
                <div className="text-[11px] font-semibold uppercase tracking-[0.35em] text-zinc-400">
                  Contact
                </div>
                <div className="mt-3 text-base font-semibold tracking-tight text-zinc-900">
                  privacy@ainewsbrief.com
                </div>
                <div className="mt-2 text-sm text-zinc-600">export and deletion</div>
              </div>
            </div>
          </div>
        </section>

        {/* Article-style reading panel — quieter surface for long-form */}
        <div className="relative overflow-hidden rounded-[var(--radius-card)] border border-[var(--glass-soft-border)] bg-[var(--glass-soft-bg)] shadow-[var(--shadow-soft)] backdrop-blur-[var(--glass-soft-blur)]">
          <article className="px-6 py-6 sm:px-8 sm:py-8">
            <div className="prose prose-sm prose-zinc max-w-none space-y-8">
              <section>
                <p className="text-zinc-600 leading-relaxed">
                  AI News Brief (&quot;Sinews&quot;, &quot;we&quot;, &quot;our&quot;) respects your privacy and is
                  committed to transparency about how we handle your data. This
                  policy explains what we collect, why, and how you can control it.
                </p>
              </section>

              <section id="data-we-collect">
                <h2 className="text-xl font-semibold mb-3">1. Data We Collect</h2>
                <div className="space-y-3 text-zinc-600">
                  <p>
                    <strong className="text-zinc-900">Email address</strong>{" "}
                    — Required for account creation and authentication via our
                    magic-link login system.
                  </p>
                  <p>
                    <strong className="text-zinc-900">Topic interests</strong>{" "}
                    — Topics you select during onboarding and any manual adjustments
                    you make in settings. These are used exclusively to personalize
                    your daily briefing.
                  </p>
                  <p>
                    <strong className="text-zinc-900">Linked account tokens</strong>{" "}
                    — When you connect X / Twitter or Google accounts, we store
                    OAuth access and refresh tokens, encrypted at rest using
                    AES-256-GCM. We never store tokens in plaintext.
                  </p>
                  <p>
                    <strong className="text-zinc-900">Reading feedback</strong>{" "}
                    — Thumbs-up and thumbs-down signals you provide on articles in
                    your briefing. These refine the ranking algorithm for future
                    briefings.
                  </p>
                  <p>
                    <strong className="text-zinc-900">Preference signals</strong>{" "}
                    — Derived from your social graph: X accounts you follow, content
                    you engage with, and Google profile interests. These feed into
                    our interest inference system.
                  </p>
                </div>
              </section>

              <section id="how-we-use-data">
                <h2 className="text-xl font-semibold mb-3">
                  2. How We Use Your Data
                </h2>
                <div className="space-y-3 text-zinc-600">
                  <p>
                    All data we collect serves a single purpose: to curate a
                    personalized daily briefing of AI and tech news that is relevant
                    to your interests. Specifically:
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>
                      Your topic selections directly influence which articles are
                      ranked higher in your daily brief.
                    </li>
                    <li>
                      Your linked account data (X follows, Google profile) helps us
                      infer additional interests you haven&apos;t explicitly
                      selected.
                    </li>
                    <li>
                      Your feedback (thumbs up/down) adjusts the weights of topics
                      and entities for future briefings.
                    </li>
                    <li>
                      Your timezone determines when your daily briefing is generated
                      and ready.
                    </li>
                  </ul>
                  <p>
                    We do not use your data for advertising, profiling beyond
                    personalization, or any purpose unrelated to the briefing
                    service. Your data is never sold, shared, or resold to third
                    parties.
                  </p>
                </div>
              </section>

              <section id="third-party-services">
                <h2 className="text-xl font-semibold mb-3">
                  3. Third-Party Services
                </h2>
                <div className="space-y-4 text-zinc-600">
                  <p>
                    We use the following third-party services to operate AI News
                    Brief:
                  </p>
                  <div className="overflow-hidden rounded-[1.5rem] border bg-white/60 shadow-sm"
                    style={{ borderColor: "rgba(255,255,255,0.70)" }}
                  >
                    <table className="w-full text-sm">
                      <thead className="bg-white/40">
                        <tr>
                          <th className="px-4 py-2 text-left font-medium">
                            Service
                          </th>
                          <th className="px-4 py-2 text-left font-medium">
                            Purpose
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/40">
                        <tr>
                          <td className="px-4 py-2 font-medium text-zinc-900">
                            Supabase
                          </td>
                          <td className="px-4 py-2">
                            Authentication (magic-link login) and primary database
                            hosting
                          </td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2 font-medium text-zinc-900">
                            OpenAI
                          </td>
                          <td className="px-4 py-2">
                            AI summarization and recommendation scoring for article
                            briefings
                          </td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2 font-medium text-zinc-900">
                            TheNewsAPI
                          </td>
                          <td className="px-4 py-2">
                            News article sourcing and metadata retrieval
                          </td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2 font-medium text-zinc-900">
                            X / Twitter API
                          </td>
                          <td className="px-4 py-2">
                            Reading your follows and engagement data (only with your
                            explicit OAuth consent)
                          </td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2 font-medium text-zinc-900">
                            Google People API
                          </td>
                          <td className="px-4 py-2">
                            Reading your Google profile information for interest
                            inference (only with your explicit OAuth consent)
                          </td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2 font-medium text-zinc-900">
                            Sentry
                          </td>
                          <td className="px-4 py-2">
                            Error monitoring and crash reporting for application
                            reliability
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-zinc-500">
                    Each third-party service is governed by its own privacy policy
                    and terms of service. We only send the minimum data necessary
                    for each service to function.
                  </p>
                </div>
              </section>

              <section id="data-retention">
                <h2 className="text-xl font-semibold mb-3">4. Data Retention</h2>
                <div className="space-y-3 text-zinc-600">
                  <p>
                    We retain different types of data for different lengths of time:
                  </p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>
                      <strong className="text-zinc-900">Raw social payloads</strong>{" "}
                      — Raw data fetched from X and Google APIs (e.g., timeline
                      content, profile fields) are purged within 7 days. Only
                      derived interest signals are retained.
                    </li>
                    <li>
                      <strong className="text-zinc-900">Interest signals</strong>{" "}
                      — Normalized interest signals (topic weights, entity
                      affinities) are stored long-term to enable continuous
                      personalization. You can reset these by disconnecting and
                      reconnecting your accounts.
                    </li>
                    <li>
                      <strong className="text-zinc-900">Article metadata</strong>{" "}
                      — Articles in our shared pool are retained indefinitely for
                      archival and deduplication purposes. These are public-facing
                      articles, not user-specific data.
                    </li>
                    <li>
                      <strong className="text-zinc-900">Daily briefs</strong>{" "}
                      — Your generated briefs are kept for 30 days so you can
                      review what you missed.
                    </li>
                    <li>
                      <strong className="text-zinc-900">Feedback events</strong>{" "}
                      — Thumbs-up/down events are retained for 90 days to inform
                      ranking adjustments.
                    </li>
                  </ul>
                </div>
              </section>

              <section id="your-rights">
                <h2 className="text-xl font-semibold mb-3">5. Your Rights</h2>
                <div className="space-y-3 text-zinc-600">
                  <p>You have full control over your data at any time:</p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>
                      <strong className="text-zinc-900">Disconnect accounts</strong>{" "}
                      — You can disconnect any linked account from your Settings
                      page. This immediately purges all encrypted access and refresh
                      tokens. Personalization signals derived from that account will
                      stop being used.
                    </li>
                    <li>
                      <strong className="text-zinc-900">Delete your account</strong>{" "}
                      — You can permanently delete your account and all associated
                      data via the Danger Zone in Settings. This includes your
                      profile, linked accounts, topic preferences, daily briefs,
                      interest signals, and feedback events. This action cannot be
                      undone.
                    </li>
                    <li>
                      <strong className="text-zinc-900">Adjust topic preferences</strong>{" "}
                      — You can add or remove topics at any time from Settings,
                      immediately affecting future briefings.
                    </li>
                    <li>
                      <strong className="text-zinc-900">Data export</strong>{" "}
                      — Contact us at{" "}
                      <Link
                        href="mailto:privacy@ainewsbrief.com"
                        className="text-blue-600 hover:underline"
                      >
                        privacy@ainewsbrief.com
                      </Link>{" "}
                      to request an export of your personal data.
                    </li>
                  </ul>
                </div>
              </section>

              <section id="oauth-scopes">
                <h2 className="text-xl font-semibold mb-3">
                  6. OAuth Scopes Requested
                </h2>
                <div className="space-y-4 text-zinc-600">
                  <p>
                    When you link an account, we request the following OAuth scopes
                    and explain exactly why:
                  </p>
                  <div className="overflow-hidden rounded-[1.5rem] border bg-white/60 shadow-sm"
                    style={{ borderColor: "rgba(255,255,255,0.70)" }}
                  >
                    <table className="w-full text-sm">
                      <thead className="bg-white/40">
                        <tr>
                          <th className="px-4 py-2 text-left font-medium">
                            Provider
                          </th>
                          <th className="px-4 py-2 text-left font-medium">
                            Scope
                          </th>
                          <th className="px-4 py-2 text-left font-medium">Why</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/40">
                        <tr>
                          <td className="px-4 py-2 font-medium text-zinc-900">
                            X / Twitter
                          </td>
                          <td className="px-4 py-2">
                            <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs">
                              tweet.read
                            </code>
                            <br />
                            <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs">
                              users.read
                            </code>
                            <br />
                            <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs">
                              follows.read
                            </code>
                          </td>
                          <td className="px-4 py-2">
                            Read tweets you&apos;ve liked to infer interests; read
                            accounts you follow for topic signals; read your basic
                            profile for identity verification
                          </td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2 font-medium text-zinc-900">
                            Google
                          </td>
                          <td className="px-4 py-2">
                            <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs">
                              .../auth/userinfo.profile
                            </code>
                            <br />
                            <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs">
                              .../auth/userinfo.email
                            </code>
                          </td>
                          <td className="px-4 py-2">
                            Read your display name and profile details for account
                            linking and interest inference from your Google
                            organization/domain
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-zinc-500">
                    We never request scopes that allow posting, messaging, or any
                    write access on your behalf. All requested scopes are read-only.
                  </p>
                </div>
              </section>

              <section id="contact">
                <h2 className="text-xl font-semibold mb-3">7. Contact</h2>
                <p className="text-zinc-600 leading-relaxed">
                  If you have questions or concerns about this Privacy Policy or our
                  data practices, please reach out at{" "}
                  <Link
                    href="mailto:privacy@ainewsbrief.com"
                    className="text-blue-600 hover:underline"
                  >
                    privacy@ainewsbrief.com
                  </Link>
                  .
                </p>
              </section>
            </div>
          </article>
        </div>
      </div>
    </PageShell>
  );
}
