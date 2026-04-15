import Link from "next/link";

export const metadata = {
  title: "Terms of Service — AI News Brief",
  description:
    "Terms of Service for AI News Brief — your rights and responsibilities when using the service.",
};

export default function TermsPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Nav */}
      <header className="border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-10 bg-zinc-50/80 dark:bg-zinc-950/80 backdrop-blur">
        <nav className="max-w-3xl mx-auto flex items-center justify-between px-6 py-3">
          <Link
            href="/"
            className="text-sm font-semibold hover:underline"
          >
            AI News Brief
          </Link>
          <div className="flex gap-4 text-sm">
            <Link
              href="/feed"
              className="text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              Feed
            </Link>
            <Link
              href="/settings"
              className="text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              Settings
            </Link>
          </div>
        </nav>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8">
          Last updated: April 15, 2026 · Version 1.0
        </p>

        <div className="prose prose-sm prose-zinc dark:prose-invert max-w-none space-y-8">
          <section>
            <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
              By creating an account or using AI News Brief (&quot;Sinews&quot;,
              &quot;the Service&quot;), you agree to these Terms of Service. If
              you do not agree, please do not use the Service.
            </p>
          </section>

          {/* Service description */}
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Service Description</h2>
            <div className="space-y-3 text-zinc-600 dark:text-zinc-400">
              <p>
                AI News Brief is a personalized daily briefing service that
                curates the top 5 AI and technology news stories for each user.
                The Service:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  Aggregates articles from multiple news sources and APIs
                </li>
                <li>
                  Uses AI (OpenAI models) to summarize and score articles
                </li>
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

          {/* Acceptable use */}
          <section>
            <h2 className="text-xl font-semibold mb-3">2. Acceptable Use</h2>
            <div className="space-y-3 text-zinc-600 dark:text-zinc-400">
              <p>When using AI News Brief, you agree not to:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  Use automated tools (scrapers, bots, crawlers) to access or
                  extract data from the Service beyond normal browsing
                </li>
                <li>
                  Attempt to bypass any rate limits or access restrictions
                </li>
                <li>
                  Use the Service to generate spam, misinformation, or harmful
                  content
                </li>
                <li>
                  Share your account credentials or allow others to access your
                  account
                </li>
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

          {/* Disclaimers */}
          <section>
            <h2 className="text-xl font-semibold mb-3">3. Disclaimers</h2>
            <div className="space-y-3 text-zinc-600 dark:text-zinc-400">
              <p>
                The Service is provided on an &quot;as is&quot; and &quot;as
                available&quot; basis. Please note:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong className="text-zinc-900 dark:text-zinc-100">
                    Not financial or legal advice
                  </strong>{" "}
                  — Content in your briefing is for informational purposes only.
                  It does not constitute financial, legal, or professional
                  advice. Always do your own research.
                </li>
                <li>
                  <strong className="text-zinc-900 dark:text-zinc-100">
                    Content accuracy depends on sources
                  </strong>{" "}
                  — Summaries are AI-generated from article content provided by
                  third-party news APIs. We do not guarantee the accuracy,
                  completeness, or timeliness of any information presented. News
                  sources may contain errors or biases, and our AI summaries may
                  introduce additional inaccuracies.
                </li>
                <li>
                  <strong className="text-zinc-900 dark:text-zinc-100">
                    No warranty
                  </strong>{" "}
                  — We do not warranty that the Service will be uninterrupted,
                  error-free, or available at any specific time. Briefings may
                  be delayed if news APIs are unavailable or if AI generation
                  fails.
                </li>
                <li>
                  <strong className="text-zinc-900 dark:text-zinc-100">
                    External links
                  </strong>{" "}
                  — Links to original articles are provided for your
                  convenience. We are not responsible for the content, privacy
                  practices, or terms of any third-party websites.
                </li>
              </ul>
            </div>
          </section>

          {/* Limitation of liability */}
          <section>
            <h2 className="text-xl font-semibold mb-3">
              4. Limitation of Liability
            </h2>
            <div className="space-y-3 text-zinc-600 dark:text-zinc-400">
              <p>
                To the maximum extent permitted by law, AI News Brief and its
                creators, contributors, and affiliates shall not be liable for
                any indirect, incidental, special, consequential, or punitive
                damages arising from your use of or inability to use the
                Service, including but not limited to:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  Loss of profits, data, or goodwill
                </li>
                <li>
                  Accuracy or inaccuracy of content in your briefing
                </li>
                <li>
                  Service interruptions, delays, or errors
                </li>
                <li>
                  Actions taken based on information presented in the Service
                </li>
                <li>
                  Unauthorized access to or alteration of your data
                </li>
              </ul>
              <p>
                Our total liability to you for any claim arising out of or
                relating to these Terms or the Service shall not exceed the
                amount you have paid us in the twelve (12) months preceding the
                claim (if any).
              </p>
            </div>
          </section>

          {/* Account termination */}
          <section>
            <h2 className="text-xl font-semibold mb-3">5. Account Termination</h2>
            <div className="space-y-3 text-zinc-600 dark:text-zinc-400">
              <p>
                Your account and access to the Service may be terminated or
                suspended:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong className="text-zinc-900 dark:text-zinc-100">
                    For cause
                  </strong>{" "}
                  — If you violate these Terms, abuse the Service, or engage in
                  fraudulent, illegal, or harmful activity, we may suspend or
                  terminate your account immediately, without prior notice.
                </li>
                <li>
                  <strong className="text-zinc-900 dark:text-zinc-100">
                    At your request
                  </strong>{" "}
                  — You may delete your account at any time from the Settings
                  page. Upon deletion, all your personal data will be purged as
                  described in our Privacy Policy.
                </li>
                <li>
                  <strong className="text-zinc-900 dark:text-zinc-100">
                    Service discontinuation
                  </strong>{" "}
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

          {/* Changes to terms */}
          <section>
            <h2 className="text-xl font-semibold mb-3">
              6. Changes to These Terms
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
              We may update these Terms from time to time. If we make material
              changes, we will notify you by email or through a prominent notice
              on the Service. Your continued use after such changes constitutes
              acceptance of the updated Terms.
            </p>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-xl font-semibold mb-3">7. Contact</h2>
            <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
              For questions about these Terms, please contact us at{" "}
              <Link
                href="mailto:legal@ainewsbrief.com"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                legal@ainewsbrief.com
              </Link>
              .
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
