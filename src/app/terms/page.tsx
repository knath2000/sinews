import Link from "next/link";
import {
  CalendarDays,
  ChevronRight,
  Newspaper,
  Scale,
  Sparkles,
} from "lucide-react";
import { PageShell } from "@/components/page-shell";

export const metadata = {
  title: "Terms of Service — AI News Brief",
  description:
    "Terms of Service for AI News Brief — your rights and responsibilities when using the service.",
};

const sectionLinks = [
  { href: "#service-description", label: "Service description" },
  { href: "#acceptable-use", label: "Acceptable use" },
  { href: "#disclaimers", label: "Disclaimers" },
  { href: "#limitation-of-liability", label: "Limitation of liability" },
  { href: "#account-termination", label: "Account termination" },
  { href: "#changes-to-terms", label: "Changes to terms" },
  { href: "#contact", label: "Contact" },
];

export default function TermsPage() {
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
                    Terms of service
                  </span>
                </span>
              </Link>
              <span className="inline-flex items-center gap-1 rounded-full border border-white/80 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-zinc-500 shadow-sm">
                <Scale className="h-3.5 w-3.5 text-sky-500" />
                Terms
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
                    Service
                  </div>
                  <div className="mt-1 text-sm font-semibold text-zinc-800">
                    Briefing app
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">personal use</div>
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
                Questions about the service, the policy, or your rights can be
                sent directly to the legal inbox.
              </p>
              <Link
                href="mailto:legal@ainewsbrief.com"
                className="mt-4 inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-2 text-xs font-medium text-white transition hover:bg-white/15"
              >
                legal@ainewsbrief.com
              </Link>
            </div>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Hero */}
        <section className="motion-fade-up relative overflow-hidden rounded-[var(--radius-hero)] border border-[var(--glass-hero-border)] bg-[var(--glass-hero-bg)] shadow-[var(--shadow-hero)] backdrop-blur-[var(--glass-hero-blur)] px-6 py-8 sm:px-8 sm:py-10">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_70%_at_15%_5%,_rgba(251,146,60,0.10),_transparent)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_50%_at_85%_10%,_rgba(56,189,248,0.07),_transparent)]" />
          <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />

          <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.32em] text-zinc-500 shadow-sm">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                Terms of service
              </div>
              <h1 className="mt-5 text-4xl font-semibold tracking-tight text-zinc-900 sm:text-5xl lg:text-6xl">
                Rights and responsibilities when using the service.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-zinc-600 sm:text-lg">
                These terms describe how AI News Brief works, what you can
                expect, and what we expect from you while using the product.
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
                  Availability
                </div>
                <div className="mt-3 text-3xl font-semibold tracking-tight text-zinc-900">
                  As-is
                </div>
                <div className="mt-2 text-sm text-zinc-600">
                  service may evolve over time
                </div>
              </div>
              <div
                className="rounded-[1.75rem] border p-4 shadow-sm"
                style={{
                  background: "linear-gradient(145deg, rgba(56,189,248,0.10), rgba(163,230,53,0.06))",
                  borderColor: "rgba(56,189,248,0.16)",
                }}
              >
                <div className="text-[11px] font-semibold uppercase tracking-[0.35em] text-zinc-400">
                  Contact
                </div>
                <div className="mt-3 text-base font-semibold tracking-tight text-zinc-900">
                  legal@ainewsbrief.com
                </div>
                <div className="mt-2 text-sm text-zinc-600">policy questions</div>
              </div>
            </div>
          </div>
        </section>

        {/* Article-style reading panel */}
        <div className="relative overflow-hidden rounded-[var(--radius-card)] border border-[var(--glass-soft-border)] bg-[var(--glass-soft-bg)] shadow-[var(--shadow-soft)] backdrop-blur-[var(--glass-soft-blur)]">
          <article className="px-6 py-6 sm:px-8 sm:py-8">
            <div className="prose prose-sm prose-zinc max-w-none space-y-8">
              <section>
                <p className="text-zinc-600 leading-relaxed">
                  By creating an account or using AI News Brief (&quot;Sinews&quot;,
                  &quot;the Service&quot;), you agree to these Terms of Service. If
                  you do not agree, please do not use the Service.
                </p>
              </section>

              <section id="service-description">
                <h2 className="text-xl font-semibold mb-3">1. Service Description</h2>
                <div className="space-y-3 text-zinc-600">
                  <p>
                    AI News Brief is a personalized daily briefing service that
                    curates the top 5 AI and technology news stories for each user.
                    The Service:
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Aggregates articles from multiple news sources and APIs</li>
                    <li>Uses AI (OpenAI models) to summarize and score articles</li>
                    <li>
                      Personalizes content based on user-selected topics, linked
                      social accounts, and reading feedback
                    </li>
                    <li>
                      Delivers briefings at a time determined by the user&apos;s
                      timezone preference
                    </li>
                  </ul>
                  <p>
                    The Service is currently provided as-is and may evolve. We
                    reserve the right to modify, suspend, or discontinue any feature
                    at any time.
                  </p>
                </div>
              </section>

              <section id="acceptable-use">
                <h2 className="text-xl font-semibold mb-3">2. Acceptable Use</h2>
                <div className="space-y-3 text-zinc-600">
                  <p>When using AI News Brief, you agree not to:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>
                      Use automated tools (scrapers, bots, crawlers) to access or
                      extract data from the Service beyond normal browsing
                    </li>
                    <li>Attempt to bypass any rate limits or access restrictions</li>
                    <li>Use the Service to generate spam, misinformation, or harmful content</li>
                    <li>Share your account credentials or allow others to access your account</li>
                    <li>
                      Reverse-engineer, decompile, or attempt to extract the
                      source code or algorithms of the Service
                    </li>
                    <li>
                      Link accounts that you do not own or have explicit permission
                      to access
                    </li>
                  </ul>
                </div>
              </section>

              <section id="disclaimers">
                <h2 className="text-xl font-semibold mb-3">3. Disclaimers</h2>
                <div className="space-y-3 text-zinc-600">
                  <p>
                    The Service is provided on an &quot;as is&quot; and &quot;as
                    available&quot; basis. Please note:
                  </p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>
                      <strong className="text-zinc-900">Not financial or legal advice</strong>{" "}
                      — Content in your briefing is for informational purposes only.
                      It does not constitute financial, legal, or professional
                      advice. Always do your own research.
                    </li>
                    <li>
                      <strong className="text-zinc-900">Content accuracy depends on sources</strong>{" "}
                      — Summaries are AI-generated from article content provided by
                      third-party news APIs. We do not guarantee the accuracy,
                      completeness, or timeliness of any information presented. News
                      sources may contain errors or biases, and our AI summaries may
                      introduce additional inaccuracies.
                    </li>
                    <li>
                      <strong className="text-zinc-900">No warranty</strong>{" "}
                      — We do not warranty that the Service will be uninterrupted,
                      error-free, or available at any specific time. Briefings may
                      be delayed if news APIs are unavailable or if AI generation
                      fails.
                    </li>
                    <li>
                      <strong className="text-zinc-900">External links</strong>{" "}
                      — Links to original articles are provided for your
                      convenience. We are not responsible for the content, privacy
                      practices, or terms of any third-party websites.
                    </li>
                  </ul>
                </div>
              </section>

              <section id="limitation-of-liability">
                <h2 className="text-xl font-semibold mb-3">
                  4. Limitation of Liability
                </h2>
                <div className="space-y-3 text-zinc-600">
                  <p>
                    To the maximum extent permitted by law, AI News Brief and its
                    creators, contributors, and affiliates shall not be liable for
                    any indirect, incidental, special, consequential, or punitive
                    damages arising from your use of or inability to use the
                    Service, including but not limited to:
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Loss of profits, data, or goodwill</li>
                    <li>Accuracy or inaccuracy of content in your briefing</li>
                    <li>Service interruptions, delays, or errors</li>
                    <li>Actions taken based on information presented in the Service</li>
                    <li>Unauthorized access to or alteration of your data</li>
                  </ul>
                  <p>
                    Our total liability to you for any claim arising out of or
                    relating to these Terms or the Service shall not exceed the
                    amount you have paid us in the twelve (12) months preceding the
                    claim (if any).
                  </p>
                </div>
              </section>

              <section id="account-termination">
                <h2 className="text-xl font-semibold mb-3">5. Account Termination</h2>
                <div className="space-y-3 text-zinc-600">
                  <p>
                    Your account and access to the Service may be terminated or
                    suspended:
                  </p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>
                      <strong className="text-zinc-900">For cause</strong>{" "}
                      — If you violate these Terms, abuse the Service, or engage in
                      fraudulent, illegal, or harmful activity, we may suspend or
                      terminate your account immediately, without prior notice.
                    </li>
                    <li>
                      <strong className="text-zinc-900">At your request</strong>{" "}
                      — You may delete your account at any time from the Settings
                      page. Upon deletion, all your personal data will be purged as
                      described in our Privacy Policy.
                    </li>
                    <li>
                      <strong className="text-zinc-900">Service discontinuation</strong>{" "}
                      — If we discontinue the Service, we will provide reasonable
                      notice and delete all user data as described in our Privacy
                      Policy.
                    </li>
                  </ul>
                  <p>
                    Upon termination, your right to use the Service will
                    immediately cease. Provisions of these Terms that by their
                    nature should survive termination (including disclaimers,
                    limitation of liability, and governing law) will remain in
                    effect.
                  </p>
                </div>
              </section>

              <section id="changes-to-terms">
                <h2 className="text-xl font-semibold mb-3">
                  6. Changes to These Terms
                </h2>
                <p className="text-zinc-600 leading-relaxed">
                  We may update these Terms from time to time. If we make material
                  changes, we will notify you by email or through a prominent notice
                  on the Service. Your continued use after such changes constitutes
                  acceptance of the updated Terms.
                </p>
              </section>

              <section id="contact">
                <h2 className="text-xl font-semibold mb-3">7. Contact</h2>
                <p className="text-zinc-600 leading-relaxed">
                  For questions about these Terms, please contact us at{" "}
                  <Link
                    href="mailto:legal@ainewsbrief.com"
                    className="text-blue-600 hover:underline"
                  >
                    legal@ainewsbrief.com
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
