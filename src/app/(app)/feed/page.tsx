"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowUpRight,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Clock,
  Moon,
  Newspaper,
  Settings2,
  Sparkles,
  Sun,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { getCachedBrief, setCachedBrief } from "./feed-cache";
import {
  normalizeFeedPayload,
  parseReplacementArticle,
  type FeedArticleData,
} from "./feed-response";
import { humanizeSafariTopic, joinHumanList } from "@/lib/safari-insights";
import { useTheme } from "@/lib/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { PageShell } from "@/components/page-shell";
import { isProbablyArticleImageUrl } from "@/lib/image-suitability";

const sidebarLinks = [
  { href: "/feed", label: "Feed" },
  { href: "/settings", label: "Settings" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];

const fallbackGradients = [
  "linear-gradient(135deg, rgba(15,23,42,0.92), rgba(59,130,246,0.74))",
  "linear-gradient(135deg, rgba(194,65,12,0.9), rgba(251,146,60,0.76))",
  "linear-gradient(135deg, rgba(67,56,202,0.92), rgba(37,99,235,0.72))",
];

const decorTiles = ["/window.svg", "/globe.svg", "/file.svg"];

interface PersonalizationData {
  topicsCovered: number;
  totalActiveTopics: number;
  activeSignals: number;
  articlesReadToday: number;
  recentReading: Array<{
    title: string;
    source: string;
    matchedTopics: string[];
    readAt: string;
  }>;
}

function formatTime(dateStr: string | null): string {
  if (!dateStr) return "Pending";
  try {
    return new Date(dateStr).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "Pending";
  }
}

function formatDateLabel(dateStr: string | null): string {
  const value = dateStr ? new Date(dateStr) : new Date();
  return value.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getDisplayNameFallback(email: string): string {
  const match = email.match(/^([^@]+)/);
  return match ? match[1].charAt(0).toUpperCase() + match[1].slice(1) : "there";
}

function StatBlock({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail?: string;
}) {
  return (
    <div
      className="rounded-[1.35rem] border p-4"
      style={{
        background: "var(--surface-card-bg-strong)",
        borderColor: "var(--surface-border-white)",
      }}
    >
      <p className="text-panel-label text-[11px] font-semibold uppercase tracking-[0.26em]">
        {label}
      </p>
      <p className="text-strong mt-2 text-2xl font-semibold tracking-tight">
        {value}
      </p>
      {detail ? <p className="text-muted mt-1 text-xs">{detail}</p> : null}
    </div>
  );
}

function DesktopSidebar({
  loading,
  generatedAt,
  articleCount,
  topics,
  personalization,
}: {
  loading: boolean;
  generatedAt: string | null;
  articleCount: number;
  topics: string[];
  personalization: PersonalizationData;
}) {
  const pathname = usePathname();

  return (
    <div className="hidden lg:block">
      <div className="sticky top-0 flex max-h-[calc(100vh-2rem)] flex-col gap-4 overflow-hidden rounded-[var(--radius-hero)] border border-[var(--glass-panel-border)] bg-[var(--glass-panel-bg)] p-5 shadow-[var(--shadow-hero)] backdrop-blur-[var(--glass-panel-blur)]">
        <div>
          <div className="inline-flex items-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-950 text-white shadow-[0_16px_30px_-18px_rgba(15,23,42,0.9)] dark:bg-zinc-100 dark:text-zinc-950">
              <Newspaper className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-strong text-lg font-semibold tracking-tight">
                AI News Digest
              </h2>
              <p className="text-muted text-sm">
                Daily AI briefing
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <StatBlock
            label="Stories"
            value={loading ? "…" : articleCount}
            detail="Today’s stack"
          />
          <StatBlock
            label="Updated"
            value={generatedAt ? formatTime(generatedAt) : "Pending"}
            detail={generatedAt ? formatDateLabel(generatedAt) : "Regenerating"}
          />
        </div>

        <nav className="space-y-2">
          {sidebarLinks.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`group flex items-center rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                  active
                    ? "bg-zinc-950 text-white shadow-[0_18px_36px_-24px_rgba(15,23,42,0.9)] dark:bg-zinc-100 dark:text-zinc-950"
                    : "text-zinc-950 hover:-translate-y-0.5 hover:bg-white/90 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                }`}
                style={{
                  borderColor: active ? "rgba(15,23,42,0.05)" : "var(--surface-border-white)",
                  backgroundColor: active ? undefined : "var(--surface-card-bg)",
                }}
              >
                {link.label}
                <ChevronRight className={`ml-auto h-4 w-4 transition ${active ? "opacity-80" : "opacity-35 group-hover:opacity-60"}`} />
              </Link>
            );
          })}
        </nav>

        <section
          className="rounded-[1.4rem] border p-4"
          style={{
            background: "var(--surface-soft-panel)",
            borderColor: "var(--surface-border-white)",
          }}
        >
          <div className="text-panel-label flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.26em]">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            Personalization
          </div>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted">Topics covered</dt>
              <dd className="text-strong font-medium">
                {personalization.topicsCovered}/{personalization.totalActiveTopics || 0}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted">Signals active</dt>
              <dd className="text-strong font-medium">
                {personalization.activeSignals}
              </dd>
            </div>
          </dl>
          {topics.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {topics.slice(0, 4).map((topic) => (
                <span
                  key={topic}
                  className="rounded-full border px-3 py-1 text-[11px] font-medium text-muted"
                  style={{
                    background: "rgba(56, 189, 248, 0.08)",
                    borderColor: "rgba(56, 189, 248, 0.16)",
                  }}
                >
                  {topic.replace(/_/g, " ")}
                </span>
              ))}
            </div>
          ) : null}
        </section>

        <div className="mt-auto border-t pt-4" style={{ borderColor: "var(--surface-border-subtle)" }}>
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}

function MobileInsights({
  open,
  onToggle,
  personalization,
  topics,
}: {
  open: boolean;
  onToggle: () => void;
  personalization: PersonalizationData;
  topics: string[];
}) {
  return (
    <section className="lg:hidden">
      <div className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--glass-soft-border)] bg-[var(--glass-soft-bg)] shadow-[var(--shadow-soft)] backdrop-blur-[var(--glass-soft-blur)]">
        <button
          type="button"
          onClick={onToggle}
          className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
        >
          <div>
            <p className="text-panel-label text-[11px] font-semibold uppercase tracking-[0.26em]">
              Personalization
            </p>
            <p className="text-muted mt-1 text-sm">
              {personalization.topicsCovered} topics covered, {personalization.activeSignals} signals active
            </p>
          </div>
          <ChevronDown className={`text-subtle h-4 w-4 transition ${open ? "rotate-180" : ""}`} />
        </button>
        {open ? (
          <div className="border-t px-5 py-4" style={{ borderColor: "var(--surface-border-subtle)" }}>
            <div className="grid grid-cols-2 gap-3">
              <StatBlock
                label="Topics"
                value={`${personalization.topicsCovered}/${personalization.totalActiveTopics || 0}`}
              />
              <StatBlock label="Signals" value={personalization.activeSignals} />
            </div>
            {topics.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {topics.slice(0, 5).map((topic) => (
                  <span
                    key={topic}
                    className="text-muted rounded-full border px-3 py-1 text-[11px] font-medium"
                    style={{
                      background: "rgba(56, 189, 248, 0.08)",
                      borderColor: "rgba(56, 189, 248, 0.16)",
                    }}
                  >
                    {topic.replace(/_/g, " ")}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--glass-soft-border)] bg-[var(--glass-soft-bg)] shadow-[var(--shadow-soft)] backdrop-blur-[var(--glass-soft-blur)]">
      <div className="h-48 animate-pulse bg-gradient-to-br from-zinc-200 via-zinc-100 to-white dark:from-zinc-700 dark:via-zinc-800 dark:to-zinc-900" />
      <div className="space-y-4 p-5">
        <div className="h-4 w-24 animate-pulse rounded-full bg-zinc-200/90 dark:bg-zinc-700/90" />
        <div className="h-8 w-4/5 animate-pulse rounded-2xl bg-zinc-200/90 dark:bg-zinc-700/90" />
        <div className="space-y-2">
          <div className="h-4 w-full animate-pulse rounded-full bg-zinc-200/75 dark:bg-zinc-700/75" />
          <div className="h-4 w-5/6 animate-pulse rounded-full bg-zinc-200/75 dark:bg-zinc-700/75" />
        </div>
      </div>
    </div>
  );
}

function GeneratingState() {
  return (
    <section className="rounded-[var(--radius-card)] border border-[var(--glass-soft-border)] bg-[var(--glass-soft-bg)] p-8 text-center shadow-[var(--shadow-soft)] backdrop-blur-[var(--glass-soft-blur)]">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950">
        <Sparkles className="h-6 w-6" />
      </div>
      <h2 className="text-strong mt-4 text-2xl font-semibold tracking-tight">
        Generating your briefing
      </h2>
      <p className="text-muted mx-auto mt-3 max-w-lg text-sm leading-relaxed">
        We’re ranking stories, checking imagery, and writing the summaries. Refresh in a moment.
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-zinc-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white"
      >
        Refresh now
        <ArrowUpRight className="h-4 w-4" />
      </button>
    </section>
  );
}

function ConsentPrompt({
  acceptingConsent,
  onAccept,
}: {
  acceptingConsent: boolean;
  onAccept: () => void;
}) {
  return (
    <section className="rounded-[var(--radius-card)] border border-[var(--glass-soft-border)] bg-[var(--glass-soft-bg)] p-8 shadow-[var(--shadow-soft)] backdrop-blur-[var(--glass-soft-blur)]">
      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950">
          <Settings2 className="h-6 w-6" />
        </div>
        <h2 className="text-strong mt-4 text-2xl font-semibold tracking-tight">
          Updated Privacy Policy &amp; Terms
        </h2>
        <p className="text-muted mx-auto mt-3 max-w-xl text-sm leading-relaxed">
          Please review the latest policy and terms before continuing to your briefing.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/privacy"
            className="text-muted rounded-full border px-4 py-2 text-sm font-medium transition hover:bg-white/80"
            style={{ borderColor: "var(--surface-border-white)", backgroundColor: "var(--surface-card-bg)" }}
          >
            Privacy
          </Link>
          <Link
            href="/terms"
            className="text-muted rounded-full border px-4 py-2 text-sm font-medium transition hover:bg-white/80"
            style={{ borderColor: "var(--surface-border-white)", backgroundColor: "var(--surface-card-bg)" }}
          >
            Terms
          </Link>
        </div>
        <button
          type="button"
          onClick={onAccept}
          disabled={acceptingConsent}
          className="mt-6 inline-flex items-center justify-center rounded-full bg-zinc-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white"
        >
          {acceptingConsent ? "Accepting…" : "I Agree & Continue"}
        </button>
      </div>
    </section>
  );
}

function ReadingHistory({
  items,
  readToday,
}: {
  items: Array<{ title: string; source: string; matchedTopics: string[]; readAt: string }>;
  readToday: number;
}) {
  return (
    <section className="rounded-[var(--radius-card)] border border-[var(--glass-soft-border)] bg-[var(--glass-soft-bg)] p-5 shadow-[var(--shadow-soft)] backdrop-blur-[var(--glass-soft-blur)]">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-panel-label text-[11px] font-semibold uppercase tracking-[0.26em]">
            Reading activity
          </p>
          <h2 className="text-strong mt-1 text-xl font-semibold tracking-tight">
            Recently researched
          </h2>
        </div>
        <div className="text-muted rounded-full border px-3 py-1 text-xs font-medium" style={{ borderColor: "var(--surface-border-white)", backgroundColor: "var(--surface-card-bg)" }}>
          {readToday} read today
        </div>
      </div>

      {items.length === 0 ? (
        <div className="text-muted mt-5 rounded-[1.25rem] border border-dashed p-6 text-sm" style={{ borderColor: "var(--surface-status-dashed)", backgroundColor: "var(--surface-status-bg)" }}>
          Engage with stories to build a visible reading history.
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {items.map((item, index) => (
            <div
              key={`${item.title}-${index}`}
              className="flex items-start gap-3 rounded-[1.25rem] border p-4"
              style={{ borderColor: "var(--surface-border-white)", backgroundColor: "var(--surface-card-bg)" }}
            >
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950">
                <BookOpen className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-strong font-medium">{item.title}</p>
                <p className="text-muted mt-1 text-sm">{item.source}</p>
                {item.matchedTopics.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {item.matchedTopics.slice(0, 3).map((topic) => (
                      <span
                        key={topic}
                        className="text-muted rounded-full border px-2.5 py-1 text-[11px] font-medium"
                        style={{
                          background: "rgba(56, 189, 248, 0.08)",
                          borderColor: "rgba(56, 189, 248, 0.16)",
                        }}
                      >
                        {topic.replace(/_/g, " ")}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="text-subtle shrink-0 text-xs">
                {new Date(item.readAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function ArticleCard({
  article,
  index,
  onDownvote,
}: {
  article: FeedArticleData;
  index: number;
  onDownvote?: (article: FeedArticleData) => void;
}) {
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);

  // Reset local feedback state when a replacement article is swapped in.
  // The parent must use a key that changes when the article changes (e.g.
  // `article.brief_item_id-${article.id}`). React will unmount/remount the
  // component, naturally clearing `feedback` state.

  const handleFeedback = useCallback(
    (type: "thumbs_up" | "thumbs_down") => {
      setFeedback(type === "thumbs_up" ? "up" : "down");
      if (type === "thumbs_down") {
        // Delegate to parent for possible card replacement
        onDownvote?.(article);
      } else {
        // Thumbs-up is optimistic fire-and-forget
        fetch("/api/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            briefItemId: article.brief_item_id,
            eventType: type,
            articleId: article.id,
          }),
        }).catch(() => {});
      }
    },
    [article, onDownvote]
  );

  const accent = fallbackGradients[index % fallbackGradients.length];
  const decorTile = decorTiles[index % decorTiles.length];
  const trustedImage = isProbablyArticleImageUrl(article.image_url) ? article.image_url : null;
  const imageStyle = trustedImage
    ? {
        backgroundImage: `linear-gradient(180deg, rgba(15,23,42,0.04), rgba(15,23,42,0.2)), url("${trustedImage}")`,
      }
    : {
        backgroundImage: `${accent}, url("${decorTile}")`,
        backgroundSize: "cover, 30%",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center, center",
      };
  const safariInfluence = article.provenance?.safari_history_import;
  const safariInfluenceTopics = safariInfluence?.top_topics
    .map((item) => humanizeSafariTopic(item.topic))
    .slice(0, 2) ?? [];
  const safariInfluenceLabel =
    safariInfluenceTopics.length > 0
      ? `Influenced by Safari history: ${joinHumanList(safariInfluenceTopics)}`
      : "Influenced by Safari history";

  return (
    <article className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--glass-panel-border)] bg-[var(--glass-panel-bg)] shadow-[var(--shadow-soft)] backdrop-blur-[var(--glass-panel-blur)]">
      <div
        data-testid={trustedImage ? "article-image" : "article-image-fallback"}
        className="relative h-[190px] border-b sm:h-[220px] lg:h-[240px]"
        style={{
          ...imageStyle,
          borderColor: "var(--surface-border-subtle)",
          backgroundPosition: trustedImage ? "center" : "center, center",
          backgroundSize: trustedImage ? "cover" : "cover, 30%",
        }}
      >
        {!trustedImage ? (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,_rgba(255,255,255,0.26),_transparent_24%),radial-gradient(circle_at_80%_20%,_rgba(255,255,255,0.12),_transparent_22%)]" />
        ) : null}
      </div>

      <div className="space-y-5 p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="text-panel-label rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]"
            style={{ backgroundColor: "var(--surface-card-bg)", border: "1px solid var(--surface-border-white)" }}
          >
            {article.source_name}
          </span>
          <span className="rounded-full bg-zinc-950 px-3 py-1 text-xs font-semibold text-white dark:bg-zinc-100 dark:text-zinc-950">
            #{article.rank}
          </span>
          {article.published_at ? (
            <span className="text-muted inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium" style={{ backgroundColor: "var(--surface-status-bg)", border: "1px solid var(--surface-border-white)" }}>
              <Clock className="h-3.5 w-3.5" />
              {formatTime(article.published_at)}
            </span>
          ) : null}
        </div>

        <div>
          <h2 className="text-strong editorial-line-clamp-2 text-2xl font-semibold tracking-tight">
            {article.title}
          </h2>
          {article.summary ? (
            <p className="text-muted editorial-line-clamp-4 mt-3 text-[15px] leading-7">
              {article.summary}
            </p>
          ) : null}
        </div>

        {article.why_recommended ? (
          <div
            className="rounded-[1.25rem] border p-4"
            style={{
              background: "rgba(56, 189, 248, 0.08)",
              borderColor: "rgba(56, 189, 248, 0.16)",
            }}
          >
            <p className="text-accent-panel text-[11px] font-semibold uppercase tracking-[0.24em]">
              Why this made the brief
            </p>
            <p className="text-accent-panel editorial-line-clamp-3 mt-2 text-sm leading-6">
              {article.why_recommended}
            </p>
            {safariInfluence?.contributed ? (
              <div
                className="mt-3 rounded-[1rem] border px-3 py-2"
                style={{
                  backgroundColor: "rgba(56, 189, 248, 0.08)",
                  borderColor: "rgba(56, 189, 248, 0.16)",
                }}
              >
                <p className="text-accent-panel text-[11px] font-semibold uppercase tracking-[0.24em]">
                  Safari history
                </p>
                <p className="text-accent-panel mt-1 text-sm leading-6">
                  {safariInfluenceLabel}
                </p>
              </div>
            ) : null}
          </div>
        ) : null}

        {article.matched_signals?.length ? (
          <div className="flex flex-wrap gap-2">
            {article.matched_signals.slice(0, 5).map((signal) => (
              <span
                key={signal}
                className="text-muted rounded-full border px-3 py-1 text-[11px] font-medium"
                style={{
                  background: "var(--surface-card-bg)",
                  borderColor: "var(--surface-border-white)",
                }}
              >
                {signal.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        ) : null}

        <div className="flex flex-col gap-4 border-t pt-4 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: "var(--surface-border-subtle)" }}>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleFeedback("thumbs_up")}
              className={`inline-flex h-10 w-10 items-center justify-center rounded-full border transition ${
                feedback === "up"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-900/50 dark:bg-emerald-900/30 dark:text-emerald-400"
                  : "text-subtle hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-600 dark:text-zinc-400 dark:hover:border-emerald-900/50 dark:hover:bg-emerald-900/20"
              }`}
              style={feedback !== "up" ? { borderColor: "var(--surface-border-white)", backgroundColor: "var(--surface-card-bg)" } : undefined}
              aria-label="Thumbs up"
              aria-pressed={feedback === "up"}
            >
              <ThumbsUp className="h-4.5 w-4.5" />
            </button>
            <button
              type="button"
              onClick={() => handleFeedback("thumbs_down")}
              className={`inline-flex h-10 w-10 items-center justify-center rounded-full border transition ${
                feedback === "down"
                  ? "border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-900/50 dark:bg-rose-900/30 dark:text-rose-400"
                  : "text-subtle hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 dark:text-zinc-400 dark:hover:border-rose-900/50 dark:hover:bg-rose-900/20"
              }`}
              style={feedback !== "down" ? { borderColor: "var(--surface-border-white)", backgroundColor: "var(--surface-card-bg)" } : undefined}
              aria-label="Thumbs down"
              aria-pressed={feedback === "down"}
            >
              <ThumbsDown className="h-4.5 w-4.5" />
            </button>
          </div>

          <a
            href={article.canonical_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-zinc-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white"
          >
            Read original
            <ArrowUpRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </article>
  );
}

export default function FeedPage() {
  const [loading, setLoading] = useState(true);
  const [articles, setArticles] = useState<FeedArticleData[] | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [consentNeeded, setConsentNeeded] = useState(false);
  const [acceptingConsent, setAcceptingConsent] = useState(false);
  const [displayName, setDisplayName] = useState<string>("");
  const [topics, setTopics] = useState<string[]>([]);
  const [personalizationOpen, setPersonalizationOpen] = useState(false);
  const [personalization, setPersonalization] = useState<PersonalizationData>({
    topicsCovered: 0,
    totalActiveTopics: 0,
    activeSignals: 0,
    articlesReadToday: 0,
    recentReading: [],
  });
  const { isDark, toggleDark, loading: themeLoading } = useTheme();

  useEffect(() => {
    let mounted = true;
    let pollCount = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function fetchBrief(): Promise<boolean> {
      try {
        const res = await fetch("/api/feed");
        if (res.ok) {
          const data = await res.json();
          const normalized = normalizeFeedPayload(data);
          if (normalized && mounted) {
            setArticles(normalized.articles);
            setGeneratedAt(normalized.generatedAt);
            setCachedBrief(normalized);
          }
          return !!normalized;
        }

        if (res.status === 202) {
          if (mounted) {
            setArticles(null);
            setGeneratedAt(null);
          }
          return false;
        }

        return false;
      } catch {
        return false;
      }
    }

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
      } catch {}

      const cached = getCachedBrief();
      if (cached && cached.articles.length > 0) {
        setArticles(cached.articles);
        setGeneratedAt(cached.generatedAt);
        setLoading(false);

        while (mounted && pollCount < 15) {
          pollCount += 1;
          if (await fetchBrief()) return;
          await new Promise<void>((resolve) => {
            timer = setTimeout(resolve, 5000);
          });
        }

        return;
      }

      while (mounted && pollCount < 15) {
        pollCount += 1;
        if (await fetchBrief()) {
          setLoading(false);
          return;
        }
        await new Promise<void>((resolve) => {
          timer = setTimeout(resolve, 5000);
        });
      }

      setLoading(false);
    }

    load();

    return () => {
      mounted = false;
      if (timer) clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    fetch("/api/me")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!mounted || !data) return;
        const name = data.profile?.displayName || "";
        setDisplayName(
          name
            ? name.trim()
            : data.user?.email
              ? getDisplayNameFallback(data.user.email)
              : "there"
        );
      })
      .catch(() => {});

    fetch("/api/settings/topics")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!mounted || !data?.preferences) return;
        setTopics(
          data.preferences
            .filter((preference: { topic: string; weight: number }) => preference.weight > 0)
            .map((preference: { topic: string }) => preference.topic)
        );
      })
      .catch(() => {});

    fetch("/api/feed/personalization")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!mounted || !data?.personalization) return;
        setPersonalization(data.personalization);
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, []);

  const handleAcceptConsent = async () => {
    setAcceptingConsent(true);
    try {
      const response = await fetch("/api/settings/consent", { method: "POST" });
      if (response.ok) {
        setConsentNeeded(false);
        window.location.reload();
        return;
      }
    } catch {}
    setAcceptingConsent(false);
  };

  const hasArticles = Array.isArray(articles) && articles.length > 0;

  // -- Downvote handler: POST /api/feedback and swap the card if replaced --

  const handleDownvote = useCallback(
    async (disliked: FeedArticleData) => {
      try {
        const res = await fetch("/api/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            briefItemId: disliked.brief_item_id,
            eventType: "thumbs_down",
            articleId: disliked.id,
          }),
        });
        if (!res.ok) return;
        const data = (await res.json()) as {
          ok: boolean;
          recorded: boolean;
          replaced: boolean;
          article?: Record<string, unknown> | null;
        };
        if (data.replaced && data.article) {
          const replacement = parseReplacementArticle(data.article);
          if (replacement) {
            const newGeneratedAt = new Date().toISOString();

            setArticles((prev) => {
              if (!prev) return prev;
              return prev.map((a) =>
                a.brief_item_id === disliked.brief_item_id ? replacement : a
              );
            });

            setGeneratedAt(newGeneratedAt);

            const cached = getCachedBrief();
            if (cached) {
              setCachedBrief({
                articles: cached.articles.map((a) =>
                  a.brief_item_id === disliked.brief_item_id ? replacement : a
                ),
                generatedAt: newGeneratedAt,
              });
            }
          }
        }
      } catch {
        // Silently fail — the feedback event was still recorded server-side
      }
    },
    []
  );

  return (
    <PageShell
      shellClassName="lg:grid-cols-[270px_minmax(0,1fr)]"
      contentClassName="space-y-5"
      sidebar={
        <DesktopSidebar
          loading={loading}
          generatedAt={generatedAt}
          articleCount={hasArticles ? articles.length : 0}
          topics={topics}
          personalization={personalization}
        />
      }
    >
      <header className="flex items-center justify-between rounded-[var(--radius-card)] border border-[var(--glass-panel-border)] bg-[var(--glass-panel-bg)] px-5 py-4 shadow-[var(--shadow-soft)] backdrop-blur-[var(--glass-panel-blur)] lg:hidden">
        <Link href="/feed" className="inline-flex items-center gap-2 text-base font-semibold tracking-tight text-zinc-950 dark:text-zinc-100">
          <Sparkles className="h-5 w-5 text-sky-500" />
          AI News Digest
        </Link>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleDark}
            disabled={themeLoading}
            className="text-muted inline-flex h-9 w-9 items-center justify-center rounded-full border transition hover:bg-white/80"
            style={{ borderColor: "var(--surface-border-white)", backgroundColor: "var(--surface-card-bg)" }}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <Link
            href="/settings"
            className="text-muted inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition hover:bg-white/80"
            style={{ borderColor: "var(--surface-border-white)", backgroundColor: "var(--surface-card-bg)" }}
          >
            <Settings2 className="h-4 w-4" />
            Settings
          </Link>
        </div>
      </header>

      <section className="rounded-[var(--radius-card)] border border-[var(--glass-panel-border)] bg-[var(--glass-panel-bg)] px-5 py-5 shadow-[var(--shadow-soft)] backdrop-blur-[var(--glass-panel-blur)] sm:px-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-muted text-sm">
              {getGreeting()}, {displayName || "there"}
            </p>
            <h1 className="text-strong mt-1 text-[clamp(1.8rem,3vw,2.35rem)] font-semibold tracking-tight">
              Your daily curated briefing
            </h1>
            <p className="text-muted mt-2 inline-flex items-center gap-1.5 text-sm">
              <Clock className="h-4 w-4" />
              {generatedAt ? `Updated ${formatTime(generatedAt)} · ${formatDateLabel(generatedAt)}` : "Preparing today’s brief"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-[1.15rem] border px-4 py-3 text-right" style={{ borderColor: "var(--surface-border-white)", backgroundColor: "var(--surface-card-bg)" }}>
              <div className="text-panel-label text-[11px] font-semibold uppercase tracking-[0.24em]">
                Stories
              </div>
              <div className="text-strong mt-1 text-2xl font-semibold tracking-tight">
                {hasArticles ? articles.length : 0}
              </div>
            </div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="text-muted inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition hover:-translate-y-0.5 hover:bg-white/80"
              style={{ borderColor: "var(--surface-border-white)", backgroundColor: "var(--surface-card-bg)" }}
            >
              Refresh
              <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      <MobileInsights
        open={personalizationOpen}
        onToggle={() => setPersonalizationOpen((value) => !value)}
        personalization={personalization}
        topics={topics}
      />

      {consentNeeded ? (
        <ConsentPrompt acceptingConsent={acceptingConsent} onAccept={handleAcceptConsent} />
      ) : loading && !hasArticles ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <SkeletonCard key={index} />
          ))}
        </div>
      ) : !articles ? (
        <GeneratingState />
      ) : hasArticles ? (
        <div className="space-y-4">
          {articles.map((article, index) => (
            <ArticleCard key={`${article.brief_item_id}-${article.id}`} article={article} index={index} onDownvote={handleDownvote} />
          ))}
          <ReadingHistory
            items={personalization.recentReading}
            readToday={personalization.articlesReadToday}
          />
        </div>
      ) : (
        <GeneratingState />
      )}
    </PageShell>
  );
}
