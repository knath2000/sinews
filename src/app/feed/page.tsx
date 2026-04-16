"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import {
  ExternalLink,
  ThumbsUp,
  ThumbsDown,
  Clock,
  Sparkles,
  Shield,
} from "lucide-react";

interface FeedArticleData {
  id: number;
  title: string;
  source_name: string;
  canonical_url: string;
  published_at: string | null;
  summary: string | null;
  why_recommended: string | null;
  matched_signals: string[] | null;
  rank: number;
  score: number;
  brief_item_id: number;
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 animate-pulse">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-4 w-24 bg-zinc-200 dark:bg-zinc-800 rounded" />
        <div className="h-3 w-16 bg-zinc-100 dark:bg-zinc-850 rounded" />
      </div>
      <div className="h-6 w-3/4 bg-zinc-200 dark:bg-zinc-800 rounded mb-3" />
      <div className="space-y-2">
        <div className="h-3 w-full bg-zinc-100 dark:bg-zinc-850 rounded" />
        <div className="h-3 w-5/6 bg-zinc-100 dark:bg-zinc-850 rounded" />
      </div>
      <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-2">
        <div className="h-8 w-8 bg-zinc-100 dark:bg-zinc-850 rounded-full" />
        <div className="h-8 w-8 bg-zinc-100 dark:bg-zinc-850 rounded-full" />
        <div className="h-8 w-24 bg-zinc-100 dark:bg-zinc-850 rounded" />
      </div>
    </div>
  );
}

function GeneratingState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="p-4 rounded-full bg-blue-50 dark:bg-blue-950 mb-6">
        <Sparkles className="w-8 h-8 text-blue-500 animate-pulse" />
      </div>
      <h2 className="text-xl font-semibold mb-2">
        Generating your briefing...
      </h2>
      <p className="text-zinc-500 dark:text-zinc-400 max-w-sm">
        We are scraping sources, ranking by your interests, and writing AI
        summaries. This usually takes a minute or two.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="mt-6 px-4 py-2 text-sm rounded-full border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
      >
        Check again
      </button>
    </div>
  );
}

function formatTime(dateStr: string | null): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function ArticleCard({
  article,
}: {
  article: FeedArticleData;
}) {
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);

  const handleFeedback = useCallback(
    (type: "thumbs_up" | "thumbs_down") => {
      setFeedback(type === "thumbs_up" ? "up" : "down");
      fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          briefItemId: article.brief_item_id,
          eventType: type,
          articleId: article.id,
        }),
      }).catch(() => {});
    },
    [article.brief_item_id, article.id]
  );

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 transition-shadow hover:shadow-md">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
          {article.source_name}
        </span>
        <span className="text-xs text-zinc-400">#{article.rank}</span>
        {article.published_at && (
          <span className="text-xs text-zinc-400 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatTime(article.published_at)}
          </span>
        )}
      </div>

      <h2 className="text-lg font-semibold mb-2 leading-snug">
        {article.title}
      </h2>

      {article.summary && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3 leading-relaxed">
          {article.summary}
        </p>
      )}

      {article.why_recommended && (
        <div className="text-xs text-zinc-500 dark:text-zinc-500 mb-4 pl-3 border-l-2 border-blue-400 dark:border-blue-600">
          {article.why_recommended}
        </div>
      )}

      {article.matched_signals && article.matched_signals.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {article.matched_signals.map((signal) => {
            const display = signal.replace(/_/g, " ");
            return (
              <span
                key={signal}
                className="text-xs px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800"
              >
                {display}
              </span>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between pt-4 border-t border-zinc-100 dark:border-zinc-800">
        <div className="flex gap-1">
          <button
            onClick={() => handleFeedback("thumbs_up")}
            className={`p-1.5 rounded-full transition-colors ${
              feedback === "up"
                ? "bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400"
                : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400"
            }`}
            aria-label="Thumbs up"
          >
            <ThumbsUp className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleFeedback("thumbs_down")}
            className={`p-1.5 rounded-full transition-colors ${
              feedback === "down"
                ? "bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400"
                : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400"
            }`}
            aria-label="Thumbs down"
          >
            <ThumbsDown className="w-4 h-4" />
          </button>
        </div>
        <a
          href={article.canonical_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
        >
          Read original
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
}

export default function FeedPage() {
  const [loading, setLoading] = useState(true);
  const [articles, setArticles] = useState<FeedArticleData[] | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [consentNeeded, setConsentNeeded] = useState(false);
  const [acceptingConsent, setAcceptingConsent] = useState(false);

  useEffect(() => {
    let pollCount = 0;
    let timer: ReturnType<typeof setTimeout>;

    async function load() {
      try {
        const consentRes = await fetch("/api/settings/consent");
        if (consentRes.ok) {
          const consentData = await consentRes.json();
          if (!consentData.isCurrent) {
            setConsentNeeded(true);
            setLoading(false);
            return;
          }
        }
      } catch {
        // Continue without blocking on consent check error
      }

      pollCount++;
      const stillGenerating = pollCount < 15;

      try {
        const res = await fetch("/api/feed");
        if (res.ok) {
          const data = await res.json();
          setArticles(data.articles);
          setGeneratedAt(data.generatedAt);
          setLoading(false);
          return;
        } else if (res.status === 202) {
          setArticles(null);
          setGeneratedAt(null);
          if (stillGenerating) {
            timer = setTimeout(load, 5000);
          } else {
            setLoading(false);
          }
        } else {
          setLoading(false);
        }
      } catch {
        console.error("Failed to fetch brief");
        setLoading(false);
      }
    }
    load();

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, []);

  const handleAcceptConsent = async () => {
    setAcceptingConsent(true);
    try {
      const res = await fetch("/api/settings/consent", { method: "POST" });
      if (res.ok) {
        setConsentNeeded(false);
        window.location.reload();
        return;
      }
    } catch {
      // fall through
    }
    setAcceptingConsent(false);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-10 bg-zinc-50/80 dark:bg-zinc-950/80 backdrop-blur">
        <nav className="max-w-3xl mx-auto flex items-center justify-between px-6 py-3">
          <Link
            href="/"
            className="text-sm font-semibold hover:underline"
          >
            AI News Brief
          </Link>
          <div className="flex gap-4 text-sm">
            <a
              href="/settings"
              className="text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              Settings
            </a>
          </div>
        </nav>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-8">
        {generatedAt && (
          <p className="text-xs text-zinc-400 mb-6">
            Updated today at {formatTime(generatedAt)}
          </p>
        )}

        {consentNeeded && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 rounded-full bg-blue-50 dark:bg-blue-950 mb-6">
              <Shield className="w-8 h-8 text-blue-500" />
            </div>
            <h2 className="text-xl font-semibold mb-2">
              Updated Privacy Policy &amp; Terms
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400 max-w-sm mb-6 leading-relaxed">
              We&apos;ve updated our Privacy Policy and Terms of Service. Please review
              and accept them to continue using the service.
            </p>
            <div className="flex gap-6 mb-6 text-sm">
              <Link
                href="/privacy"
                className="text-blue-600 dark:text-blue-400 hover:underline"
                target="_blank"
              >
                Privacy Policy &rarr;
              </Link>
              <Link
                href="/terms"
                className="text-blue-600 dark:text-blue-400 hover:underline"
                target="_blank"
              >
                Terms of Service &rarr;
              </Link>
            </div>
            <button
              onClick={handleAcceptConsent}
              disabled={acceptingConsent}
              className="px-6 py-3 text-sm font-semibold rounded-full bg-blue-600 text-white hover:bg-blue-500 transition-colors disabled:opacity-50"
            >
              {acceptingConsent ? "Accepting..." : "I Agree &amp; Continue"}
            </button>
          </div>
        )}

        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="mb-4">
              <SkeletonCard />
            </div>
          ))
        ) : articles === null ? (
          <GeneratingState />
        ) : (
          <>
            {articles.map((article) => (
              <div key={article.rank} className="mb-4">
                <ArticleCard article={article} />
              </div>
            ))}

            {articles.length === 0 && (
              <GeneratingState />
            )}
          </>
        )}
      </main>
    </div>
  );
}
