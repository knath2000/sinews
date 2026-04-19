"use client";

import { useCallback, useEffect, useSyncExternalStore, useState } from "react";
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
import { BRIEF_PHASES, PHASE_MESSAGES, PHASE_ORDER } from "@/lib/brief-progress";

interface BriefProgressState {
  generating: boolean;
  status: "pending" | "generating" | "failed";
  progress: {
    phase: string;
    message: string;
    step: number;
    totalSteps: number;
    itemsCompleted: number;
    itemsTotal: number;
    updatedAt: string;
  };
  pollAfterMs: number;
}

const sidebarLinks = [
  { href: "/feed", label: "Feed" },
  { href: "/settings", label: "Settings" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Service" },
];

const fallbackGradients = [
  "linear-gradient(135deg, var(--ds-surface-2), var(--ds-surface-1))",
  "linear-gradient(135deg, var(--ds-surface-1), var(--ds-bg))",
  "linear-gradient(135deg, var(--ds-surface-2), var(--ds-bg))",
];

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

// ── Sidebar mini stat ───────────────────────────────────────────

function SidebarStat({
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
      {detail && (
        <p className="mt-0.5 text-[11px]" style={{ color: "var(--ds-text-dim)" }}>
          {detail}
        </p>
      )}
    </div>
  );
}

function DesktopSidebar({
  loading,
  generatedAt,
  articleCount,
  topics,
  personalization,
  mounted,
}: {
  loading: boolean;
  generatedAt: string | null;
  articleCount: number;
  topics: string[];
  personalization: PersonalizationData;
  mounted: boolean;
}) {
  const pathname = usePathname();

  return (
    <div className="hidden lg:block">
      <div
        className="sticky top-0 flex max-h-[calc(100vh-2rem)] flex-col gap-5 overflow-hidden rounded-[12px] border p-5"
        style={{
          backgroundColor: "var(--ds-surface-1)",
          borderColor: "var(--ds-border)",
        }}
      >
        <div className="inline-flex items-center gap-3">
          <span
            className="inline-flex h-10 w-10 items-center justify-center rounded-[10px]"
            style={{ backgroundColor: "var(--ds-accent)" }}
          >
            <Newspaper className="h-5 w-5" style={{ color: "var(--ds-bg)" }} />
          </span>
          <div>
            <h2 className="text-base font-semibold tracking-tight" style={{ color: "var(--ds-text)" }}>
              AI News Digest
            </h2>
            <p className="text-sm" style={{ color: "var(--ds-text-dim)" }}>Daily AI briefing</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <SidebarStat label="Stories" value={loading ? "…" : articleCount} detail="Today's stack" />
          <SidebarStat
            label="Updated"
            value={mounted && generatedAt ? formatTime(generatedAt) : "…"}
            detail={mounted && generatedAt ? formatDateLabel(generatedAt) : "Regenerating"}
          />
        </div>

        <nav className="space-y-1">
          {sidebarLinks.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className="group flex items-center rounded-[10px] px-3.5 py-2.5 text-sm font-medium transition-colors"
                style={{
                  color: active ? "var(--ds-accent)" : "var(--ds-text-muted)",
                  backgroundColor: active ? "var(--ds-accent-soft)" : "transparent",
                  boxShadow: active && typeof window !== "undefined" && document.documentElement.classList.contains("dark")
                    ? "var(--ds-accent-glow)"
                    : "none",
                }}
              >
                {link.label}
                <ChevronRight
                  className="ml-auto h-4 w-4 transition-opacity"
                  style={{ opacity: active ? 0.8 : 0.3 }}
                />
              </Link>
            );
          })}
        </nav>

        <section
          className="rounded-[10px] border p-4"
          style={{
            backgroundColor: "var(--ds-surface-2)",
            borderColor: "var(--ds-border)",
          }}
        >
          <div
            className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest"
            style={{ color: "var(--ds-text-dim)" }}
          >
            <Sparkles className="h-3.5 w-3.5" style={{ color: "var(--ds-accent)" }} />
            Personalization
          </div>
          <dl className="mt-3 space-y-2.5 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt style={{ color: "var(--ds-text-dim)" }}>Topics covered</dt>
              <dd className="font-medium" style={{ color: "var(--ds-text)" }}>
                {personalization.topicsCovered}/{personalization.totalActiveTopics || 0}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt style={{ color: "var(--ds-text-dim)" }}>Signals active</dt>
              <dd className="font-medium" style={{ color: "var(--ds-text)" }}>
                {personalization.activeSignals}
              </dd>
            </div>
          </dl>
          {topics.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {topics.slice(0, 4).map((topic) => (
                <span
                  key={topic}
                  className="rounded-full border px-2.5 py-0.5 text-[10px] font-medium"
                  style={{
                    backgroundColor: "var(--ds-surface-1)",
                    borderColor: "var(--ds-border)",
                    color: "var(--ds-text-dim)",
                  }}
                >
                  {topic.replace(/_/g, " ")}
                </span>
              ))}
            </div>
          )}
        </section>

        <div className="mt-auto pt-4" style={{ borderTop: "1px solid var(--ds-border)" }}>
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
      <div
        className="overflow-hidden rounded-[12px] border"
        style={{
          backgroundColor: "var(--ds-surface-1)",
          borderColor: "var(--ds-border)",
        }}
      >
        <button
          type="button"
          onClick={onToggle}
          className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
        >
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--ds-text-dim)" }}>
              Personalization
            </p>
            <p className="mt-1 text-sm" style={{ color: "var(--ds-text-muted)" }}>
              {personalization.topicsCovered} topics covered, {personalization.activeSignals} signals active
            </p>
          </div>
          <ChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} style={{ color: "var(--ds-text-dim)" }} />
        </button>
        {open && (
          <div className="border-t px-5 py-4" style={{ borderColor: "var(--ds-border)" }}>
            <div className="grid grid-cols-2 gap-3">
              <SidebarStat label="Topics" value={`${personalization.topicsCovered}/${personalization.totalActiveTopics || 0}`} />
              <SidebarStat label="Signals" value={personalization.activeSignals} />
            </div>
            {topics.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {topics.slice(0, 5).map((topic) => (
                  <span
                    key={topic}
                    className="rounded-full border px-2.5 py-1 text-[11px] font-medium"
                    style={{
                      backgroundColor: "var(--ds-surface-2)",
                      borderColor: "var(--ds-border)",
                      color: "var(--ds-text-dim)",
                    }}
                  >
                    {topic.replace(/_/g, " ")}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-[12px] border" style={{ borderColor: "var(--ds-border)", backgroundColor: "var(--ds-surface-1)" }}>
      <div className="h-48 animate-pulse" style={{ backgroundColor: "var(--ds-surface-2)" }} />
      <div className="space-y-4 p-5">
        <div className="h-4 w-24 animate-pulse rounded-full" style={{ backgroundColor: "var(--ds-surface-2)" }} />
        <div className="h-8 w-4/5 animate-pulse rounded-lg" style={{ backgroundColor: "var(--ds-surface-2)" }} />
        <div className="space-y-2">
          <div className="h-4 w-full animate-pulse rounded-lg" style={{ backgroundColor: "var(--ds-surface-2)" }} />
          <div className="h-4 w-5/6 animate-pulse rounded-lg" style={{ backgroundColor: "var(--ds-surface-2)" }} />
        </div>
      </div>
    </div>
  );
}

function BriefProgressCard({
  progress,
  onRefresh,
}: {
  progress: BriefProgressState["progress"];
  onRefresh: () => void;
}) {
  const isFailed = progress.phase === "failed";
  const targetOrder = isFailed ? 6 : (PHASE_ORDER[progress.phase] ?? 0);

  // Local state to simulate smooth visual progression
  const [currentOrder, setCurrentOrder] = useState(0);

  useEffect(() => {
    if (isFailed) {
      setCurrentOrder(6);
      return;
    }
    if (currentOrder < targetOrder) {
      const timer = setTimeout(() => {
        setCurrentOrder((prev) => prev + 1);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [currentOrder, targetOrder, isFailed]);

  // Derive UI phase from the simulated currentOrder
  const phaseKeys = Object.keys(PHASE_ORDER);
  const displayPhase =
    phaseKeys.find((k) => PHASE_ORDER[k as keyof typeof PHASE_ORDER] === currentOrder) ?? "starting";
  const displayMessage =
    currentOrder === targetOrder ? progress.message : PHASE_MESSAGES[displayPhase];
  const isWritingSummaries = displayPhase === "writing_summaries";

  if (isFailed) {
    return (
      <section className="rounded-[12px] border p-8 text-center" style={{ borderColor: "rgba(239,68,68,0.25)", backgroundColor: "var(--ds-surface-1)" }}>
        <div
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-full"
          style={{ backgroundColor: "rgba(239,68,68,0.1)", color: "#ef4444" }}
        >
          <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="font-display mt-4 text-2xl font-semibold tracking-tight" style={{ color: "var(--ds-text)" }}>
          {progress.message}
        </h2>
        <button
          type="button"
          onClick={onRefresh}
          className="mt-6 inline-flex items-center gap-2 rounded-[10px] px-5 py-2.5 text-sm font-semibold transition-colors"
          style={{ backgroundColor: "var(--ds-accent)", color: "var(--ds-bg)" }}
        >
          Try again
          <ArrowUpRight className="h-4 w-4" />
        </button>
      </section>
    );
  }

  return (
    <section className="rounded-[12px] border p-6 sm:p-8" style={{ borderColor: "var(--ds-border)", backgroundColor: "var(--ds-surface-1)" }}>
      {/* Spinner + headline */}
      <div className="text-center">
        <div
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-full"
          style={{ backgroundColor: "var(--ds-accent)" }}
        >
          <svg className="h-7 w-7 animate-spin" fill="none" viewBox="0 0 24 24" style={{ color: "var(--ds-bg)" }}>
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
        <h2 className="mt-4 text-xl font-semibold tracking-tight" style={{ color: "var(--ds-text)" }}>
          {displayMessage}
        </h2>

        {progress.totalSteps > 0 && (
          <p className="mt-2 text-sm" style={{ color: "var(--ds-text-muted)" }}>
            Step {Math.min(currentOrder + 1, progress.totalSteps)} of {progress.totalSteps}
          </p>
        )}

        {isWritingSummaries && progress.itemsTotal > 0 && (
          <p className="mt-1 text-xs" style={{ color: "var(--ds-text-dim)" }}>
            {progress.itemsCompleted} of {progress.itemsTotal} summaries written
          </p>
        )}
      </div>

      {/* Phase checklist */}
      <div className="mt-6 space-y-1.5">
        {BRIEF_PHASES.map((phase) => {
          const order = PHASE_ORDER[phase];
          const isComplete = order < currentOrder;
          const isCurrent = order === currentOrder;

          return (
            <div
              key={phase}
              className="flex items-center gap-3 rounded-[10px] px-3 py-2 text-sm transition-colors"
              style={{
                color: isCurrent
                  ? "var(--ds-accent)"
                  : isComplete
                    ? "#22c55e"
                    : "var(--ds-text-dim)",
                backgroundColor: isCurrent ? "var(--ds-accent-soft)" : "transparent",
              }}
            >
              {isComplete ? (
                <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : isCurrent ? (
                <svg className="h-4 w-4 shrink-0 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <span className="h-4 w-4 shrink-0" style={{ color: "var(--ds-text-dim)" }}>
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <circle cx="12" cy="12" r="6" />
                  </svg>
                </span>
              )}
              <span className="truncate">{PHASE_MESSAGES[phase]}</span>
            </div>
          );
        })}
      </div>

      {/* Refresh button */}
      <div className="mt-6 text-center">
        <button
          type="button"
          onClick={onRefresh}
          className="ds-btn-secondary inline-flex items-center gap-1 text-xs"
        >
          Refresh now
          <ArrowUpRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </section>
  );
}

function FeedErrorCard({ onRetry }: { onRetry: () => void }) {
  return (
    <section className="rounded-[12px] border p-8 text-center" style={{ borderColor: "rgba(239,68,68,0.25)", backgroundColor: "var(--ds-surface-1)" }}>
      <div
        className="mx-auto flex h-14 w-14 items-center justify-center rounded-full"
        style={{ backgroundColor: "rgba(239,68,68,0.1)", color: "#ef4444" }}
      >
        <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h2 className="font-display mt-4 text-2xl font-semibold tracking-tight" style={{ color: "var(--ds-text)" }}>
        We couldn&apos;t load your briefing
      </h2>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed" style={{ color: "var(--ds-text-muted)" }}>
        The feed is temporarily unavailable. We&apos;ll keep trying in the background.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-6 inline-flex items-center gap-2 rounded-[10px] px-5 py-2.5 text-sm font-semibold"
        style={{ backgroundColor: "var(--ds-accent)", color: "var(--ds-bg)" }}
      >
        Try again
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
    <section className="rounded-[12px] border p-8" style={{ borderColor: "var(--ds-border)", backgroundColor: "var(--ds-surface-1)" }}>
      <div className="text-center">
        <div
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-[10px]"
          style={{ backgroundColor: "var(--ds-surface-2)" }}
        >
          <Settings2 className="h-6 w-6" style={{ color: "var(--ds-accent)" }} />
        </div>
        <h2 className="font-display mt-4 text-2xl font-semibold tracking-tight" style={{ color: "var(--ds-text)" }}>
          Updated Privacy Policy &amp; Terms
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed" style={{ color: "var(--ds-text-muted)" }}>
          Please review the latest policy and terms before continuing to your briefing.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <Link href="/privacy" className="ds-btn-secondary">
            Privacy
          </Link>
          <Link href="/terms" className="ds-btn-secondary">
            Terms
          </Link>
        </div>
        <button
          type="button"
          onClick={onAccept}
          disabled={acceptingConsent}
          className="mt-6 ds-btn justify-center"
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
    <section className="rounded-[12px] border p-5" style={{ borderColor: "var(--ds-border)", backgroundColor: "var(--ds-surface-1)" }}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--ds-text-dim)" }}>
            Reading activity
          </p>
          <h2 className="font-display mt-1 text-xl font-semibold tracking-tight" style={{ color: "var(--ds-text)" }}>
            Recently researched
          </h2>
        </div>
        <div
          className="rounded-full border px-3 py-1 text-xs font-medium"
          style={{ borderColor: "var(--ds-border)", backgroundColor: "var(--ds-surface-2)", color: "var(--ds-text-muted)" }}
        >
          {readToday} read today
        </div>
      </div>

      {items.length === 0 ? (
        <div
          className="mt-5 rounded-[10px] border border-dashed p-6 text-sm"
          style={{ borderColor: "var(--ds-border)", backgroundColor: "var(--ds-surface-2)", color: "var(--ds-text-dim)" }}
        >
          Engage with stories to build a visible reading history.
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {items.map((item, index) => (
            <div
              key={`${item.title}-${index}`}
              className="flex items-start gap-3 rounded-[10px] border p-4"
              style={{ borderColor: "var(--ds-border)", backgroundColor: "var(--ds-surface-2)" }}
            >
              <div
                className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]"
                style={{ backgroundColor: "var(--ds-accent)" }}
              >
                <BookOpen className="h-4 w-4" style={{ color: "var(--ds-bg)" }} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium" style={{ color: "var(--ds-text)" }}>{item.title}</p>
                <p className="mt-1 text-sm" style={{ color: "var(--ds-text-muted)" }}>{item.source}</p>
                {item.matchedTopics.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {item.matchedTopics.slice(0, 3).map((topic) => (
                      <span
                        key={topic}
                        className="rounded-full border px-2.5 py-1 text-[11px] font-medium"
                        style={{
                          backgroundColor: "var(--ds-surface-1)",
                          borderColor: "var(--ds-border)",
                          color: "var(--ds-text-dim)",
                        }}
                      >
                        {topic.replace(/_/g, " ")}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="shrink-0 text-xs" style={{ color: "var(--ds-text-dim)" }}>
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
  mounted,
}: {
  article: FeedArticleData;
  index: number;
  onDownvote?: (article: FeedArticleData) => void;
  mounted: boolean;
}) {
  const [feedback, setFeedback] = useState<"up" | "down" | null>(
    article.user_feedback === "thumbs_up" ? "up"
      : article.user_feedback === "thumbs_down" ? "down"
      : null
  );

  const handleFeedback = useCallback(
    (type: "thumbs_up" | "thumbs_down") => {
      setFeedback(type === "thumbs_up" ? "up" : "down");
      if (type === "thumbs_down") {
        onDownvote?.(article);
      } else {
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
  const trustedImage = isProbablyArticleImageUrl(article.image_url) ? article.image_url : null;
  const imageStyle = trustedImage
    ? { backgroundImage: `url("${trustedImage}")`, backgroundSize: "cover", backgroundPosition: "center" }
    : { backgroundImage: accent, backgroundSize: "cover" };
  const safariInfluence = article.provenance?.safari_history_import;
  const safariInfluenceTopics = safariInfluence?.top_topics
    .map((item) => humanizeSafariTopic(item.topic))
    .slice(0, 2) ?? [];
  const safariInfluenceLabel =
    safariInfluenceTopics.length > 0
      ? `Influenced by Safari history: ${joinHumanList(safariInfluenceTopics)}`
      : "Influenced by Safari history";

  return (
    <article className="overflow-hidden rounded-[12px] border" style={{ borderColor: "var(--ds-border)", backgroundColor: "var(--ds-surface-1)" }}>
      {trustedImage ? (
        <div
          className="relative h-[190px] border-b sm:h-[220px] lg:h-[240px]"
          style={{ ...imageStyle, borderColor: "var(--ds-border)", backgroundImage: `url("${trustedImage}")`, backgroundSize: "cover", backgroundPosition: "center" }}
        />
      ) : (
        <div
          className="relative h-[190px] border-b sm:h-[220px] lg:h-[240px]"
          style={{ ...imageStyle, borderColor: "var(--ds-border)" }}
        />
      )}

      <div className="space-y-5 p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-widest"
            style={{ borderColor: "var(--ds-border)", backgroundColor: "var(--ds-surface-2)", color: "var(--ds-text-muted)" }}
          >
            {article.source_name}
          </span>
          <span
            className="rounded-full px-3 py-1 text-xs font-semibold"
            style={{ backgroundColor: "var(--ds-accent)", color: "var(--ds-bg)" }}
          >
            #{article.rank}
          </span>
          {article.published_at && mounted && (
            <span
              className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium"
              style={{ borderColor: "var(--ds-border)", backgroundColor: "var(--ds-surface-2)", color: "var(--ds-text-muted)" }}
            >
              <Clock className="h-3.5 w-3.5" />
              {formatTime(article.published_at)}
            </span>
          )}
        </div>

        <div>
          {!article.is_paywalled && article.tldr && (
            <p className="mb-2 text-sm font-semibold leading-6" style={{ color: "var(--ds-accent)" }}>
              TL;DR: {article.tldr}
            </p>
          )}
          <h2 className="font-display text-[clamp(1.25rem,2vw,1.5rem)] font-semibold leading-[1.25] tracking-tight" style={{ color: "var(--ds-text)" }}>
            {article.title}
          </h2>

          {article.is_paywalled ? (
            <div className="relative mt-4 overflow-hidden rounded-[10px] border p-5" style={{ borderColor: "var(--ds-border)", backgroundColor: "var(--ds-surface-2)" }}>
              <div className="pointer-events-none select-none opacity-30 blur-[4px]">
                <p className="mb-2 text-sm font-semibold leading-6" style={{ color: "var(--ds-accent)" }}>
                  TL;DR: Placeholder summary awaiting upgrade
                </p>
                <p className="text-sm leading-7" style={{ color: "var(--ds-text-muted)" }}>
                  After upgrading, AI-generated summaries will appear here, extracting key points,
                  entities, and the core takeaway so you don't need to read the full article.
                </p>
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-t from-[var(--ds-surface-2)]/80 to-transparent">
                <span className="mb-3 text-sm font-bold tracking-wide" style={{ color: "var(--ds-text)" }}>Premium AI Summary Locked</span>
                <Link href="/settings" className="inline-flex h-9 items-center justify-center rounded-[10px] px-4 text-sm font-medium transition-colors" style={{ backgroundColor: "var(--ds-accent)", color: "var(--ds-bg)" }}>
                  Upgrade to Premium
                </Link>
              </div>
            </div>
          ) : (
            article.summary && (
              <p className="editorial-line-clamp-4 mt-3 text-sm leading-7" style={{ color: "var(--ds-text-muted)" }}>
                {article.summary}
              </p>
            )
          )}
        </div>

        {article.why_recommended && !article.is_paywalled && (
          <div
            className="rounded-[10px] border p-4"
            style={{
              backgroundColor: "var(--ds-accent-soft)",
              borderColor: "var(--ds-accent)",
            }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--ds-accent)" }}>
              Why this made the brief
            </p>
            <p className="editorial-line-clamp-3 mt-2 text-sm leading-6" style={{ color: "var(--ds-accent)", opacity: 0.85 }}>
              {article.why_recommended}
            </p>
            {safariInfluence?.contributed && (
              <div
                className="mt-3 rounded-[10px] border px-3 py-2"
                style={{
                  backgroundColor: "var(--ds-surface-1)",
                  borderColor: "var(--ds-border)",
                }}
              >
                <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--ds-text-dim)" }}>
                  Safari history
                </p>
                <p className="mt-1 text-sm leading-6" style={{ color: "var(--ds-text-muted)" }}>
                  {safariInfluenceLabel}
                </p>
              </div>
            )}
          </div>
        )}

        {article.matched_signals?.length && (
          <div className="flex flex-wrap gap-2">
            {article.matched_signals.slice(0, 5).map((signal) => (
              <span
                key={signal}
                className="rounded-full border px-3 py-1 text-[11px] font-medium"
                style={{
                  backgroundColor: "var(--ds-surface-2)",
                  borderColor: "var(--ds-border)",
                  color: "var(--ds-text-dim)",
                }}
              >
                {signal.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-4 border-t pt-4 sm:flex-row sm:items-center sm:justify-between" style={{ borderTop: "1px solid var(--ds-border)" }}>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleFeedback("thumbs_up")}
              className="inline-flex h-10 w-10 items-center justify-center rounded-[10px] border transition-colors"
              style={{
                borderColor: feedback === "up" ? "rgba(34,197,94,0.35)" : "var(--ds-border)",
                backgroundColor: feedback === "up" ? "rgba(34,197,94,0.1)" : "var(--ds-surface-2)",
                color: feedback === "up" ? "#22c55e" : "var(--ds-text-muted)",
              }}
              aria-label="Thumbs up"
              aria-pressed={feedback === "up"}
            >
              <ThumbsUp className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => handleFeedback("thumbs_down")}
              className="inline-flex h-10 w-10 items-center justify-center rounded-[10px] border transition-colors"
              style={{
                borderColor: feedback === "down" ? "rgba(239,68,68,0.35)" : "var(--ds-border)",
                backgroundColor: feedback === "down" ? "rgba(239,68,68,0.1)" : "var(--ds-surface-2)",
                color: feedback === "down" ? "#ef4444" : "var(--ds-text-muted)",
              }}
              aria-label="Thumbs down"
              aria-pressed={feedback === "down"}
            >
              <ThumbsDown className="h-4 w-4" />
            </button>
          </div>

          <a
            href={article.canonical_url}
            target="_blank"
            rel="noopener noreferrer"
            className="ds-btn"
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
  const [progressState, setProgressState] = useState<BriefProgressState | null>(null);
  const [feedError, setFeedError] = useState(false);
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
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  // Check consent first, then start continuous polling
  useEffect(() => {
    let mounted = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let failed = false;

    async function fetchBrief(): Promise<{ ok: boolean }> {
      const pollTime = new Date().toLocaleTimeString();
      console.log(`[FEED_POLL] Fetching /api/feed at ${pollTime}`);

      try {
        const res = await fetch(`/api/feed?_t=${Date.now()}`, {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
          },
        });

        console.log(`[FEED_POLL] Response Status: ${res.status}`);

        // res.ok is true for ALL 2xx (including 202), so we must explicitly check 200
        if (res.status === 200) {
          const data = await res.json();
          console.log("[FEED_POLL] 200 OK - Articles Received:", data);
          const normalized = normalizeFeedPayload(data);
          if (normalized && mounted) {
            setArticles(normalized.articles);
            setGeneratedAt(normalized.generatedAt);
            setCachedBrief(normalized);
            setProgressState(null);
            setFeedError(false);
            setLoading(false);
          }
          return { ok: !!normalized };
        }

        if (res.status === 202) {
          const data = await res.json() as BriefProgressState;
          console.log(
            `[FEED_POLL] 202 Accepted - Phase: ${data.progress?.phase}, Step: ${data.progress?.step}`,
            data
          );
          if (mounted) {
            setProgressState(data);
            setFeedError(false);
          }
          return { ok: false };
        }

        if (res.status === 503) {
          const data = await res.json() as BriefProgressState;
          console.error("[FEED_POLL] 503 Failed - Data:", data);
          if (mounted) {
            setProgressState(data);
            setFeedError(false);
            failed = true;
          }
          return { ok: false };
        }

        console.warn(`[FEED_POLL] Unhandled status >= 500:`, res.status);
        if (res.status >= 500 && mounted) {
          setFeedError(true);
          setProgressState(null);
          setLoading(false);
        }

        return { ok: false };
      } catch (err) {
        console.error("[FEED_POLL] Network or Parse Error:", err);
        if (mounted) {
          setFeedError(true);
          setProgressState(null);
          setLoading(false);
        }
        return { ok: false };
      }
    }

    function schedulePoll(ms: number, start: number) {
      if (timer) clearTimeout(timer);
      timer = setTimeout(async () => {
        timer = undefined;
        if (!mounted || failed) return;
        const { ok } = await fetchBrief();
        if (ok) return;
        if (failed) return;
        const elapsed = Date.now() - start;
        const nextMs = elapsed >= 60_000 ? 8000 : 3000;
        schedulePoll(nextMs, start);
      }, ms);
    }

    const pollStart = Date.now();

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
      }

      const { ok } = await fetchBrief();
      if (!ok && mounted) {
        setLoading(false);
        const delayMs = (Date.now() - pollStart) >= 60_000 ? 8000 : 3000;
        schedulePoll(delayMs, pollStart);
      }
    }

    load();

    return () => {
      mounted = false;
      if (timer) clearTimeout(timer);
    };
  }, []);

  const handleRefresh = useCallback(() => {
    setProgressState(null);
    setFeedError(false);
    fetch(`/api/feed?_t=${Date.now()}`, {
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
      },
    })
      .then((res) => {
        if (res.ok) return res.json().then((data) => {
          const normalized = normalizeFeedPayload(data);
          if (normalized) {
            setArticles(normalized.articles);
            setGeneratedAt(normalized.generatedAt);
            setCachedBrief(normalized);
            setProgressState(null);
            setFeedError(false);
            setLoading(false);
          }
        });
        if (res.status === 202) return res.json().then((data: BriefProgressState) => {
          setProgressState(data);
          setFeedError(false);
        });
        if (res.status >= 500) {
          setFeedError(true);
          setProgressState(null);
        }
      })
      .catch(() => {
        setFeedError(true);
        setProgressState(null);
      });
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
        // Silently fail
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
          mounted={mounted}
        />
      }
    >
      {/* ── Mobile header ───────────────────────────────── */}
      <header
        className="flex items-center justify-between rounded-[12px] border px-5 py-4 lg:hidden"
        style={{
          backgroundColor: "var(--ds-surface-1)",
          borderColor: "var(--ds-border)",
        }}
      >
        <Link href="/feed" className="inline-flex items-center gap-2 text-base font-semibold tracking-tight" style={{ color: "var(--ds-text)" }}>
          <Sparkles className="h-5 w-5" style={{ color: "var(--ds-accent)" }} />
          AI News Digest
        </Link>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleDark}
            disabled={themeLoading}
            className="ds-btn-secondary h-9 w-9 px-0 justify-center disabled:opacity-50"
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <Link href="/settings" className="ds-btn-secondary">
            <Settings2 className="h-4 w-4" />
            Settings
          </Link>
        </div>
      </header>

      {/* ── Greeting hero ───────────────────────────────── */}
      <section
        className="rounded-[12px] border px-5 py-5 sm:px-6"
        style={{
          backgroundColor: "var(--ds-surface-1)",
          borderColor: "var(--ds-border)",
        }}
      >
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-body text-xs font-medium uppercase tracking-widest" style={{ color: "var(--ds-text-dim)" }}>
              {mounted ? getGreeting() : "Welcome back"}{displayName ? `, ${displayName}` : ""}
            </p>
            <h1 className="font-display mt-2 text-[clamp(1.5rem,2.8vw,2rem)] font-semibold leading-[1.2] tracking-tight" style={{ color: "var(--ds-text)" }}>
              Your daily curated briefing
            </h1>
            <p className="mt-2 inline-flex items-center gap-1.5 text-sm" style={{ color: "var(--ds-text-muted)" }}>
              <Clock className="h-4 w-4" />
              {mounted && generatedAt
                ? `Updated ${formatTime(generatedAt)} · ${formatDateLabel(generatedAt)}`
                : generatedAt
                  ? "Preparing today's brief"
                  : "Pending"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div
              className="rounded-[10px] border px-4 py-3 text-right"
              style={{ backgroundColor: "var(--ds-surface-2)", borderColor: "var(--ds-border)" }}
            >
              <div className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--ds-text-dim)" }}>
                Stories
              </div>
              <div className="mt-1 text-2xl font-semibold tracking-tight" style={{ color: "var(--ds-text)" }}>
                {hasArticles ? articles.length : 0}
              </div>
            </div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="ds-btn-secondary"
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
      ) : feedError ? (
        <FeedErrorCard onRetry={handleRefresh} />
      ) : loading && !hasArticles ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <SkeletonCard key={index} />
          ))}
        </div>
      ) : !articles ? (
        <BriefProgressCard
          progress={
            progressState?.progress || {
              phase: "starting",
              message: "Preparing articles",
              step: 1,
              totalSteps: 6,
              itemsCompleted: 0,
              itemsTotal: 0,
              updatedAt: "1970-01-01T00:00:00.000Z",
            }
          }
          onRefresh={handleRefresh}
        />
      ) : hasArticles ? (
        <div className="space-y-4">
          {articles.map((article, index) => (
            <ArticleCard key={`${article.brief_item_id}-${article.id}`} article={article} index={index} onDownvote={handleDownvote} mounted={mounted} />
          ))}
          {mounted && (
            <ReadingHistory
              items={personalization.recentReading}
              readToday={personalization.articlesReadToday}
            />
          )}
        </div>
      ) : (
        <BriefProgressCard
          progress={{
            phase: "starting",
            message: "Preparing articles",
            step: 1,
            totalSteps: 6,
            itemsCompleted: 0,
            itemsTotal: 0,
            updatedAt: "1970-01-01T00:00:00.000Z",
          }}
          onRefresh={handleRefresh}
        />
      )}
    </PageShell>
  );
}
