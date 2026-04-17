import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowUpRight,
  ChevronRight,
  Clock,
  Newspaper,
  Shield,
  Sparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";

const previewStories = [
  {
    title: "OpenAI rolls out a cleaner developer workflow",
    source: "OpenAI",
    asset: "/window.svg",
    accent:
      "linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(59, 130, 246, 0.7))",
  },
  {
    title: "The Verge covers the next wave of consumer AI",
    source: "The Verge",
    asset: "/globe.svg",
    accent:
      "linear-gradient(135deg, rgba(251, 146, 60, 0.88), rgba(244, 114, 182, 0.78))",
  },
  {
    title: "Wired looks at what ships next for hardware",
    source: "Wired",
    asset: "/file.svg",
    accent:
      "linear-gradient(135deg, rgba(168, 85, 247, 0.88), rgba(34, 197, 94, 0.72))",
  },
];

function cssUrl(value: string): string {
  return JSON.stringify(value);
}

function PreviewThumb({
  asset,
  accent,
  label,
  floating = false,
}: {
  asset: string;
  accent: string;
  label: string;
  floating?: boolean;
}) {
  return (
    <div
      className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-white/25 shadow-[0_16px_40px_-24px_rgba(15,23,42,0.65)] ${floating ? "motion-float-soft" : ""}`}
    >
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `${accent}, url(${cssUrl(asset)})`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center, center",
          backgroundSize: "cover, 56%",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/15" />
      <span className="absolute left-2 top-2 z-10 inline-flex rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.28em] text-zinc-600 shadow-sm">
        {label}
      </span>
    </div>
  );
}

export default async function LandingPage() {
  // Server-side auth check: redirect logged-in users to feed
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      redirect("/feed");
    }
  } catch {
    // Auth not configured — show landing page as-is
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Static gradient background instead of heavy animated blurred blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-7rem] top-[-5rem] h-80 w-80 rounded-full bg-orange-200/50 blur-3xl" />
        <div className="absolute right-[-7rem] top-24 h-96 w-96 rounded-full bg-sky-200/50 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.74),_transparent_30%)] opacity-80" />
      </div>

      <header className="relative z-10 border-b border-white/60 bg-white/55 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold tracking-tight text-zinc-900 transition-transform hover:scale-[1.01]"
          >
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-zinc-900 text-white shadow-lg shadow-zinc-900/15">
              <Newspaper className="h-5 w-5" />
            </span>
            <span className="leading-tight">
              AI News Brief
              <span className="block text-xs font-medium text-zinc-500">
                A calmer daily stack
              </span>
            </span>
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <Link
              href="/login"
              className="inline-flex items-center gap-1 rounded-full px-4 py-2 text-zinc-600 transition hover:-translate-y-0.5 hover:bg-white hover:text-zinc-900"
            >
              Sign in
              <ChevronRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login?mode=signup"
              className="inline-flex items-center gap-2 rounded-full bg-zinc-900 px-4 py-2 font-medium text-white shadow-lg shadow-zinc-900/10 transition hover:-translate-y-0.5 hover:bg-zinc-800"
            >
              Create account
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </nav>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-4 pb-20 pt-10 sm:px-6 lg:px-8">
        <section className="grid gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/75 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.32em] text-zinc-500 shadow-sm backdrop-blur-xl">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              Personalized AI brief
            </div>
            <h1 className="mt-6 text-5xl font-semibold tracking-tight text-zinc-900 sm:text-6xl lg:text-7xl">
              Your daily AI briefing, brighter and easier to scan.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-zinc-600 sm:text-lg">
              We curate the 5 stories that matter most, keep the flow vertical,
              and bring in real article imagery so the feed feels calm instead of
              crowded.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login?mode=signup"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-zinc-900/10 transition hover:-translate-y-0.5 hover:bg-zinc-800"
              >
                Create account
                <ArrowUpRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/80 bg-white/80 px-6 py-3 text-sm font-semibold text-zinc-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-white hover:text-zinc-900"
              >
                Sign in
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[24px] border border-white/75 bg-white/80 p-4 shadow-sm backdrop-blur-xl">
                <div className="text-[11px] font-semibold uppercase tracking-[0.35em] text-zinc-400">
                  Signal
                </div>
                <div className="mt-2 text-lg font-semibold text-zinc-900">
                  5 stories
                </div>
                <p className="mt-1 text-sm text-zinc-600">
                  No noise, just the stack.
                </p>
              </div>
              <div className="rounded-[24px] border border-white/75 bg-white/80 p-4 shadow-sm backdrop-blur-xl">
                <div className="text-[11px] font-semibold uppercase tracking-[0.35em] text-zinc-400">
                  Personal
                </div>
                <div className="mt-2 text-lg font-semibold text-zinc-900">
                  Your interests
                </div>
                <p className="mt-1 text-sm text-zinc-600">
                  Topics and history shape the brief.
                </p>
              </div>
              <div className="rounded-[24px] border border-white/75 bg-white/80 p-4 shadow-sm backdrop-blur-xl">
                <div className="text-[11px] font-semibold uppercase tracking-[0.35em] text-zinc-400">
                  Private
                </div>
                <div className="mt-2 text-lg font-semibold text-zinc-900">
                  No selling
                </div>
                <p className="mt-1 text-sm text-zinc-600">
                  Data stays in your account.
                </p>
              </div>
            </div>
          </div>

          <div className="lg:justify-self-end">
            <div className="rounded-[36px] border border-white/75 bg-white/80 p-5 shadow-[0_32px_100px_-58px_rgba(15,23,42,0.42)] backdrop-blur-xl">
              <div className="rounded-[30px] bg-zinc-900 p-5 text-white shadow-[0_24px_60px_-36px_rgba(15,23,42,0.7)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.35em] text-white/45">
                      Morning stack
                    </div>
                    <div className="mt-2 text-2xl font-semibold tracking-tight">
                      Five stories, one scroll.
                    </div>
                  </div>
                  <div className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
                    5 items
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  {previewStories.map((story, index) => (
                    <div
                      key={story.title}
                      className="flex items-center gap-3 rounded-[24px] border border-white/10 bg-white/10 p-3"
                    >
                      <PreviewThumb
                        asset={story.asset}
                        accent={story.accent}
                        label={story.source}
                        floating={index === 1}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold uppercase tracking-[0.3em] text-white/45">
                          Curated highlight
                        </div>
                        <p className="mt-1 text-sm font-medium leading-relaxed text-white/90">
                          {story.title}
                        </p>
                      </div>
                      <Clock className="h-4 w-4 shrink-0 text-white/45" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="rounded-[22px] border border-white/75 bg-gradient-to-br from-white/90 to-sky-50/90 p-4 shadow-sm">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.35em] text-zinc-400">
                    Read
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-zinc-900">
                    5m
                  </div>
                </div>
                <div className="rounded-[22px] border border-white/75 bg-gradient-to-br from-white/90 to-amber-50/90 p-4 shadow-sm">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.35em] text-zinc-400">
                    Match
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-zinc-900">
                    smart
                  </div>
                </div>
                <div className="rounded-[22px] border border-white/75 bg-gradient-to-br from-white/90 to-violet-50/90 p-4 shadow-sm">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.35em] text-zinc-400">
                    Flow
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-zinc-900">
                    smooth
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-[26px] border border-white/75 bg-white/85 p-4 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.32em] text-zinc-400">
                  <Shield className="h-3.5 w-3.5 text-blue-500" />
                  Private by default
                </div>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                  Sign in, choose your interests, and get a brief that feels
                  clean and intentional every morning.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              title: "5 stories, not 500",
              body: "We shrink the firehose into a readable stack with enough context to act on.",
            },
            {
              title: "Interest aware",
              body: "Topics, browsing history, and feedback all shape what floats to the top.",
            },
            {
              title: "Calm by design",
              body: "Bright surfaces, softer motion, and a vertical flow keep the briefing easy to scan.",
            },
          ].map((card) => (
            <div
              key={card.title}
              className="rounded-[28px] border border-white/75 bg-white/80 p-6 shadow-[0_22px_70px_-46px_rgba(15,23,42,0.36)] backdrop-blur-xl transition hover:-translate-y-1 hover:shadow-[0_28px_80px_-46px_rgba(15,23,42,0.42)]"
            >
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-100 to-amber-50 text-sky-600">
                <Sparkles className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold tracking-tight text-zinc-900">
                {card.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                {card.body}
              </p>
            </div>
          ))}
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/60 bg-white/40 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-6 text-xs text-zinc-500 sm:flex-row sm:px-6 lg:px-8">
          <span>AI News Brief {new Date().getFullYear()}</span>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="transition hover:text-zinc-800">
              Privacy
            </Link>
            <Link href="/terms" className="transition hover:text-zinc-800">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
