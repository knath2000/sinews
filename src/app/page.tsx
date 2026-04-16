"use client";

import Link from "next/link";
import { useSupabase } from "@/lib/supabase-provider";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

function LandingPageContent() {
  const router = useRouter();
  const { session, loading, refreshSession } = useSupabase();

  // If session exists, jump to feed
  useEffect(() => {
    if (session && !loading) {
      router.push("/feed");
    }
  }, [session, loading, router]);

  if (loading || session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Nav */}
      <header className="border-b border-zinc-200 dark:border-zinc-800">
        <nav className="max-w-5xl mx-auto flex items-center justify-between px-6 py-4">
          <span className="text-lg font-semibold">AI News Brief</span>
          <div className="flex gap-3 text-sm">
            <Link
              href="/login"
              className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              Sign in
            </Link>
            <Link
              href="/login?mode=signup"
              className="inline-flex items-center justify-center px-4 py-1.5 text-sm font-medium text-white bg-zinc-900 dark:bg-white dark:text-zinc-900 rounded-full hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors"
            >
              Create account
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="max-w-3xl mx-auto px-6 pt-24 pb-16 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-6">
            Your daily 5-minute AI briefing,
            <br />
            <span className="text-blue-600 dark:text-blue-400">
              personalized for you.
            </span>
          </h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400 mb-10 max-w-xl mx-auto">
            Create an account and we curate the top 5 AI and tech stories every
            day based on what you actually care about. No noise. Just signal.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/login?mode=signup"
              className="inline-flex items-center justify-center px-6 py-3 text-sm font-medium text-white bg-zinc-900 dark:bg-white dark:text-zinc-900 rounded-full hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors"
            >
              Create Account
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center px-6 py-3 text-sm font-medium border border-zinc-300 dark:border-zinc-700 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Sign In
            </Link>
          </div>
        </section>

        {/* Feature cards */}
        <section className="max-w-4xl mx-auto px-6 pb-24">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
              <h3 className="font-semibold mb-2">5 Stories, Not 500</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                We filter thousands of articles down to the 5 that matter most
                to your interests.
              </p>
            </div>
            <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
              <h3 className="font-semibold mb-2">Interest-Aware</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Your browsing history shapes what surfaces — import your
                Safari history or manually pick topics you care about.
              </p>
            </div>
            <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
              <h3 className="font-semibold mb-2">Private by Default</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Sign in to get started, import Safari history to strengthen
                personalization. Your data is never sold.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800">
        <div className="max-w-5xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
          <span>AI News Brief {new Date().getFullYear()}</span>
          <div className="flex gap-4 mt-2 sm:mt-0">
            <Link href="/privacy" className="hover:text-zinc-700 dark:hover:text-zinc-200">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-zinc-700 dark:hover:text-zinc-200">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function LandingPage() {
  return (
    <LandingPageContent />
  );
}
