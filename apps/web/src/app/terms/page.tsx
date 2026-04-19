import Link from "next/link";
import {
  CalendarDays,
  ChevronRight,
  Newspaper,
  Scale,
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
      shellClassName="lg:grid-cols-[270px_minmax(0,1fr)]"
      sidebar={
        <TermsSidebar />
      }
    >
      {/* Hero */}
      <TermsHero />

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
                By creating an account or using AI News Brief (&quot;the Service&quot;),
                you agree to these Terms of Service. If you do not agree, please
                do not use the Service.
              </p>
            </section>

            <section id="service-description" className="scroll-mt-8">
              <h2 className="font-display text-xl font-semibold" style={{ color: "var(--ds-text)" }}>
                1. Service Description
              </h2>
              <div className="mt-3 space-y-3 text-sm leading-relaxed" style={{ color: "var(--ds-text-muted)" }}>
                <p>AI News Brief is a personalized daily briefing service that curates the top 5 AI and technology news stories for each user. The Service:</p>
                <ul className="list-disc space-y-1 pl-5">
                  <li>Aggregates articles from multiple news sources and APIs</li>
                  <li>Uses AI (OpenAI models) to summarize and score articles</li>
                  <li>Personalizes content based on user-selected topics, linked social accounts, and reading feedback</li>
                  <li>Delivers briefings at a time determined by the user&apos;s timezone preference</li>
                </ul>
                <p>The Service is currently provided as-is and may evolve. We reserve the right to modify, suspend, or discontinue any feature at any time.</p>
              </div>
            </section>

            <section id="acceptable-use" className="scroll-mt-8">
              <h2 className="font-display text-xl font-semibold" style={{ color: "var(--ds-text)" }}>
                2. Acceptable Use
              </h2>
              <div className="mt-3 space-y-3 text-sm leading-relaxed" style={{ color: "var(--ds-text-muted)" }}>
                <p>When using AI News Brief, you agree not to:</p>
                <ul className="list-disc space-y-1 pl-5">
                  <li>Use automated tools (scrapers, bots, crawlers) to access or extract data from the Service beyond normal browsing</li>
                  <li>Attempt to bypass any rate limits or access restrictions</li>
                  <li>Use the Service to generate spam, misinformation, or harmful content</li>
                  <li>Share your account credentials or allow others to access your account</li>
                  <li>Reverse-engineer, decompile, or attempt to extract the source code or algorithms of the Service</li>
                  <li>Link accounts that you do not own or have explicit permission to access</li>
                </ul>
              </div>
            </section>

            <section id="disclaimers" className="scroll-mt-8">
              <h2 className="font-display text-xl font-semibold" style={{ color: "var(--ds-text)" }}>
                3. Disclaimers
              </h2>
              <div className="mt-3 space-y-3 text-sm leading-relaxed" style={{ color: "var(--ds-text-muted)" }}>
                <p>The Service is provided on an &quot;as is&quot; and &quot;as available&quot; basis. Please note:</p>
                <ul className="list-disc space-y-2 pl-5">
                  <li>
                    <strong style={{ color: "var(--ds-text)" }}>Not financial or legal advice</strong> — Content in your briefing is for informational purposes only. It does not constitute financial, legal, or professional advice. Always do your own research.
                  </li>
                  <li>
                    <strong style={{ color: "var(--ds-text)" }}>Content accuracy depends on sources</strong> — Summaries are AI-generated from article content provided by third-party news APIs. We do not guarantee the accuracy, completeness, or timeliness of any information presented.
                  </li>
                  <li>
                    <strong style={{ color: "var(--ds-text)" }}>No warranty</strong> — We do not warranty that the Service will be uninterrupted, error-free, or available at any specific time.
                  </li>
                  <li>
                    <strong style={{ color: "var(--ds-text)" }}>External links</strong> — Links to original articles are provided for your convenience. We are not responsible for the content, privacy practices, or terms of any third-party websites.
                  </li>
                </ul>
              </div>
            </section>

            <section id="limitation-of-liability" className="scroll-mt-8">
              <h2 className="font-display text-xl font-semibold" style={{ color: "var(--ds-text)" }}>
                4. Limitation of Liability
              </h2>
              <div className="mt-3 space-y-3 text-sm leading-relaxed" style={{ color: "var(--ds-text-muted)" }}>
                <p>To the maximum extent permitted by law, AI News Brief and its creators, contributors, and affiliates shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of or inability to use the Service, including but not limited to:</p>
                <ul className="list-disc space-y-1 pl-5">
                  <li>Loss of profits, data, or goodwill</li>
                  <li>Accuracy or inaccuracy of content in your briefing</li>
                  <li>Service interruptions, delays, or errors</li>
                  <li>Actions taken based on information presented in the Service</li>
                  <li>Unauthorized access to or alteration of your data</li>
                </ul>
                <p>Our total liability to you for any claim arising out of or relating to these Terms or the Service shall not exceed the amount you have paid us in the twelve (12) months preceding the claim (if any).</p>
              </div>
            </section>

            <section id="account-termination" className="scroll-mt-8">
              <h2 className="font-display text-xl font-semibold" style={{ color: "var(--ds-text)" }}>
                5. Account Termination
              </h2>
              <div className="mt-3 space-y-2 text-sm leading-relaxed" style={{ color: "var(--ds-text-muted)" }}>
                <p>Your account and access to the Service may be terminated or suspended:</p>
                <ul className="list-disc space-y-2 pl-5">
                  <li>
                    <strong style={{ color: "var(--ds-text)" }}>For cause</strong> — If you violate these Terms, abuse the Service, or engage in fraudulent, illegal, or harmful activity, we may suspend or terminate your account immediately, without prior notice.
                  </li>
                  <li>
                    <strong style={{ color: "var(--ds-text)" }}>At your request</strong> — You may delete your account at any time from the Settings page. Upon deletion, all your personal data will be purged as described in our Privacy Policy.
                  </li>
                  <li>
                    <strong style={{ color: "var(--ds-text)" }}>Service discontinuation</strong> — If we discontinue the Service, we will provide reasonable notice and delete all user data as described in our Privacy Policy.
                  </li>
                </ul>
                <p>Upon termination, your right to use the Service will immediately cease. Provisions of these Terms that by their nature should survive termination will remain in effect.</p>
              </div>
            </section>

            <section id="changes-to-terms" className="scroll-mt-8">
              <h2 className="font-display text-xl font-semibold" style={{ color: "var(--ds-text)" }}>
                6. Changes to These Terms
              </h2>
              <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--ds-text-muted)" }}>
                We may update these Terms from time to time. If we make material
                changes, we will notify you by email or through a prominent notice
                on the Service. Your continued use after such changes constitutes
                acceptance of the updated Terms.
              </p>
            </section>

            <section id="contact" className="scroll-mt-8">
              <h2 className="font-display text-xl font-semibold" style={{ color: "var(--ds-text)" }}>
                7. Contact
              </h2>
              <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--ds-text-muted)" }}>
                For questions about these Terms, please contact us at{" "}
                <Link
                  href="mailto:legal@ainewsbrief.com"
                  className="underline underline-offset-2 hover:opacity-80"
                  style={{ color: "var(--ds-accent)" }}
                >
                  legal@ainewsbrief.com
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

function TermsSidebar() {
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
            <p className="text-sm" style={{ color: "var(--ds-text-dim)" }}>Terms of service</p>
          </div>
        </Link>

        <div
          className="rounded-[10px] border p-4"
          style={{
            backgroundColor: "var(--ds-surface-2)",
            borderColor: "var(--ds-border)",
          }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--ds-text-dim)" }}>
            Version 1.0
          </p>
          <p className="mt-1 text-xs" style={{ color: "var(--ds-text-muted)" }}>
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
            Questions about the service, the policy, or your rights.
          </p>
          <Link
            href="mailto:legal@ainewsbrief.com"
            className="mt-3 inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-[var(--ds-accent-soft)]"
            style={{
              borderColor: "var(--ds-accent)",
              color: "var(--ds-accent)",
            }}
          >
            legal@ainewsbrief.com
          </Link>
        </div>
      </div>
    </div>
  );
}

function TermsHero() {
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
            Terms of service
          </p>
          <h1
            className="font-display mt-2 text-[clamp(1.4rem,2.8vw,2rem)] font-semibold leading-[1.2] tracking-tight"
            style={{ color: "var(--ds-text)" }}
          >
            Rights and responsibilities when using the service.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed" style={{ color: "var(--ds-text-muted)" }}>
            These terms describe how AI News Brief works, what you can
            expect, and what we expect from you while using the product.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:w-[280px]">
          <MetricTile label="Availability" value="As-is" detail="may evolve over time" />
          <MetricTile label="Contact" value="legal@" detail="policy questions" />
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
