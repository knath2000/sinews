"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import {
  ExternalLink,
  ThumbsUp,
  ThumbsDown,
  Clock,
  Sparkles,
} from "lucide-react";

interface FeedArticleData {
  id: number;
  title: string;
  source_name: string;
  canonical_url: string;
  published_at: string | null;
  summary: string | null;
  why_recommended: string | null;
  rank: number;
  score: number;
  brief_item_id: number;
}

// Skeleton card component
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

// Empty state when brief is still generating
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
      // In a full implementation, this would call a server action / API route
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
      {/* Header: source + rank + time */}
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

      {/* Headline */}
      <h2 className="text-lg font-semibold mb-2 leading-snug">
        {article.title}
      </h2>

      {/* AI Summary */}
      {article.summary && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3 leading-relaxed">
          {article.summary}
        </p>
      )}

      {/* Why this was picked */}
      {article.why_recommended && (
        <div className="text-xs text-zinc-500 dark:text-zinc-500 mb-4 pl-3 border-l-2 border-blue-400 dark:border-blue-600">
          {article.why_recommended}
        </div>
      )}

      {/* Actions */}
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

// Demo data generator — moved outside render to avoid rules-of-hooks violation
function getDemoArticles(): FeedArticleData[] {
  const now = new Date();
  return Array.from({ length: 5 }).map((_, i) => ({
    id: i + 1,
    title: [
      "OpenAI Releases GPT-5 with Real-Time Reasoning",
      "Google DeepMind's New Model Breaks Protein Folding Record",
      "EU Passes Landmark AI Act with Strict Enforcement Rules",
      "Meta Launches Open-Source Llama 4 for Developers",
      "Anthropic's Claude Now Writes and Executes Code",
    ][i],
    source_name: [
      "TechCrunch",
      "Nature",
      "The Verge",
      "Ars Technica",
      "Wired",
    ][i],
    canonical_url: "#",
    published_at: new Date(
      now.getTime() - i * 3600000
    ).toISOString(),
    summary:
      "This is a demo AI summary of the article, capturing key points.",
    why_recommended: [
      "You follow OpenAI on X and read about models.",
      "High editorial priority — breakthrough research.",
      "Matches your interest in tech policy and regulation.",
      "You frequently engage with open-source ML content.",
    ][i] ?? "Based on your reading patterns.",
    rank: i + 1,
    score: 5 - i * 0.8,
    brief_item_id: i + 1,
  }));
}

export default function FeedPage() {
  const [loading, setLoading] = useState(true);
  const [articles, setArticles] = useState<FeedArticleData[] | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);

  const [demoMode, setDemoMode] = useState(false);

  useEffect(() => {
    async function loadBrief() {
      try {
        const res = await fetch("/api/feed");
        if (res.ok) {
          const data = await res.json();
          setArticles(data.articles);
          setGeneratedAt(data.generatedAt);
        } else if (res.status === 202) {
          setArticles(null);
          setGeneratedAt(null);
        }
      } catch {
        console.error("Failed to fetch brief");
      } finally {
        setLoading(false);
      }
    }
    loadBrief();
  }, []);

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
        {/* Updated timestamp */}
        {generatedAt && (
          <p className="text-xs text-zinc-400 mb-6">
            Updated today at {formatTime(generatedAt)}
          </p>
        )}

        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="mb-4">
              <SkeletonCard />
            </div>
          ))
        ) : !demoMode && articles === null ? (
          <GeneratingState />
        ) : (
          <>
            {(demoMode ? getDemoArticles() : articles ?? []
            ).map((article) => (
              <div key={article.rank} className="mb-4">
                <ArticleCard article={article} />
              </div>
            ))}

            {!demoMode && articles && articles.length === 0 && (
              <GeneratingState />
            )}
          </>
        )}

        {/* Demo mode toggle */}
        {!loading && articles === null && (
          <div className="flex justify-center mt-4">
            <button
              onClick={() => {
                setDemoMode(true);
                setArticles([]);
              }}
              className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 underline"
            >
              Preview with demo data
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
