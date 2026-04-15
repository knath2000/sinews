import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — AI News Brief",
  description:
    "Privacy policy for AI News Brief — how we collect, use, and protect your data.",
};

export default function PrivacyPage() {
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
        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8">
          Last updated: April 15, 2026 · Version 1.0
        </p>

        <div className="prose prose-sm prose-zinc dark:prose-invert max-w-none space-y-8">
          <section>
            <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
              AI News Brief (&quot;Sinews&quot;, &quot;we&quot;, &quot;our&quot;) respects your privacy and is
              committed to transparency about how we handle your data. This
              policy explains what we collect, why, and how you can control it.
            </p>
          </section>

          {/* What data we collect */}
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Data We Collect</h2>
            <div className="space-y-3 text-zinc-600 dark:text-zinc-400">
              <p>
                <strong className="text-zinc-900 dark:text-zinc-100">
                  Email address
                </strong>{" "}
                — Required for account creation and authentication via our
                magic-link login system.
              </p>
              <p>
                <strong className="text-zinc-900 dark:text-zinc-100">
                  Topic interests
                </strong>{" "}
                — Topics you select during onboarding and any manual adjustments
                you make in settings. These are used exclusively to personalize
                your daily briefing.
              </p>
              <p>
                <strong className="text-zinc-900 dark:text-zinc-100">
                  Linked account tokens
                </strong>{" "}
                — When you connect X / Twitter or Google accounts, we store
                OAuth access and refresh tokens, encrypted at rest using
                AES-256-GCM. We never store tokens in plaintext.
              </p>
              <p>
                <strong className="text-zinc-900 dark:text-zinc-100">
                  Reading feedback
                </strong>{" "}
                — Thumbs-up and thumbs-down signals you provide on articles in
                your briefing. These refine the ranking algorithm for future
                briefings.
              </p>
              <p>
                <strong className="text-zinc-900 dark:text-zinc-100">
                  Preference signals
                </strong>{" "}
                — Derived from your social graph: X accounts you follow, content
                you engage with, and Google profile interests. These feed into
                our interest inference system.
              </p>
            </div>
          </section>

          {/* How we use data */}
          <section>
            <h2 className="text-xl font-semibold mb-3">
              2. How We Use Your Data
            </h2>
            <div className="space-y-3 text-zinc-600 dark:text-zinc-400">
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

          {/* Third-party services */}
          <section>
            <h2 className="text-xl font-semibold mb-3">
              3. Third-Party Services
            </h2>
            <div className="space-y-4 text-zinc-600 dark:text-zinc-400">
              <p>
                We use the following third-party services to operate AI News
                Brief:
              </p>
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-100 dark:bg-zinc-900">
                    <tr>
                      <th className="text-left px-4 py-2 font-medium">
                        Service
                      </th>
                      <th className="text-left px-4 py-2 font-medium">
                        Purpose
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    <tr>
                      <td className="px-4 py-2 font-medium text-zinc-900 dark:text-zinc-100">
                        Supabase
                      </td>
                      <td className="px-4 py-2">
                        Authentication (magic-link login) and primary database
                        hosting
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-medium text-zinc-900 dark:text-zinc-100">
                        OpenAI
                      </td>
                      <td className="px-4 py-2">
                        AI summarization and recommendation scoring for article
                        briefings
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-medium text-zinc-900 dark:text-zinc-100">
                        TheNewsAPI
                      </td>
                      <td className="px-4 py-2">
                        News article sourcing and metadata retrieval
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-medium text-zinc-900 dark:text-zinc-100">
                        X / Twitter API
                      </td>
                      <td className="px-4 py-2">
                        Reading your follows and engagement data (only with your
                        explicit OAuth consent)
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-medium text-zinc-900 dark:text-zinc-100">
                        Google People API
                      </td>
                      <td className="px-4 py-2">
                        Reading your Google profile information for interest
                        inference (only with your explicit OAuth consent)
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-medium text-zinc-900 dark:text-zinc-100">
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

          {/* Data retention */}
          <section>
            <h2 className="text-xl font-semibold mb-3">4. Data Retention</h2>
            <div className="space-y-3 text-zinc-600 dark:text-zinc-400">
              <p>
                We retain different types of data for different lengths of time:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong className="text-zinc-900 dark:text-zinc-100">
                    Raw social payloads
                  </strong>{" "}
                  — Raw data fetched from X and Google APIs (e.g., timeline
                  content, profile fields) are purged within 7 days. Only
                  derived interest signals are retained.
                </li>
                <li>
                  <strong className="text-zinc-900 dark:text-zinc-100">
                    Interest signals
                  </strong>{" "}
                  — Normalized interest signals (topic weights, entity
                  affinities) are stored long-term to enable continuous
                  personalization. You can reset these by disconnecting and
                  reconnecting your accounts.
                </li>
                <li>
                  <strong className="text-zinc-900 dark:text-zinc-100">
                    Article metadata
                  </strong>{" "}
                  — Articles in our shared pool are retained indefinitely for
                  archival and deduplication purposes. These are public-facing
                  articles, not user-specific data.
                </li>
                <li>
                  <strong className="text-zinc-900 dark:text-zinc-100">
                    Daily briefs
                  </strong>{" "}
                  — Your generated briefs are kept for 30 days so you can
                  review what you missed.
                </li>
                <li>
                  <strong className="text-zinc-900 dark:text-zinc-100">
                    Feedback events
                  </strong>{" "}
                  — Thumbs-up/down events are retained for 90 days to inform
                  ranking adjustments.
                </li>
              </ul>
            </div>
          </section>

          {/* User rights */}
          <section>
            <h2 className="text-xl font-semibold mb-3">5. Your Rights</h2>
            <div className="space-y-3 text-zinc-600 dark:text-zinc-400">
              <p>You have full control over your data at any time:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong className="text-zinc-900 dark:text-zinc-100">
                    Disconnect accounts
                  </strong>{" "}
                  — You can disconnect any linked account from your Settings
                  page. This immediately purges all encrypted access and refresh
                  tokens. Personalization signals derived from that account will
                  stop being used.
                </li>
                <li>
                  <strong className="text-zinc-900 dark:text-zinc-100">
                    Delete your account
                  </strong>{" "}
                  — You can permanently delete your account and all associated
                  data via the Danger Zone in Settings. This includes your
                  profile, linked accounts, topic preferences, daily briefs,
                  interest signals, and feedback events. This action cannot be
                  undone.
                </li>
                <li>
                  <strong className="text-zinc-900 dark:text-zinc-100">
                    Adjust topic preferences
                  </strong>{" "}
                  — You can add or remove topics at any time from Settings,
                  immediately affecting future briefings.
                </li>
                <li>
                  <strong className="text-zinc-900 dark:text-zinc-100">
                    Data export
                  </strong>{" "}
                  — Contact us at{" "}
                  <Link
                    href="mailto:privacy@ainewsbrief.com"
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    privacy@ainewsbrief.com
                  </Link>{" "}
                  to request an export of your personal data.
                </li>
              </ul>
            </div>
          </section>

          {/* OAuth scopes */}
          <section>
            <h2 className="text-xl font-semibold mb-3">
              6. OAuth Scopes Requested
            </h2>
            <div className="space-y-4 text-zinc-600 dark:text-zinc-400">
              <p>
                When you link an account, we request the following OAuth scopes
                and explain exactly why:
              </p>
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-100 dark:bg-zinc-900">
                    <tr>
                      <th className="text-left px-4 py-2 font-medium">
                        Provider
                      </th>
                      <th className="text-left px-4 py-2 font-medium">Scope</th>
                      <th className="text-left px-4 py-2 font-medium">Why</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    <tr>
                      <td className="px-4 py-2 font-medium text-zinc-900 dark:text-zinc-100">
                        X / Twitter
                      </td>
                      <td className="px-4 py-2">
                        <code className="text-xs bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">
                          tweet.read
                        </code>
                        <br />
                        <code className="text-xs bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">
                          users.read
                        </code>
                        <br />
                        <code className="text-xs bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">
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
                      <td className="px-4 py-2 font-medium text-zinc-900 dark:text-zinc-100">
                        Google
                      </td>
                      <td className="px-4 py-2">
                        <code className="text-xs bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">
                          .../auth/userinfo.profile
                        </code>
                        <br />
                        <code className="text-xs bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">
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

          {/* Contact */}
          <section>
            <h2 className="text-xl font-semibold mb-3">7. Contact</h2>
            <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
              If you have questions or concerns about this Privacy Policy or our
              data practices, please reach out at{" "}
              <Link
                href="mailto:privacy@ainewsbrief.com"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                privacy@ainewsbrief.com
              </Link>
              .
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
