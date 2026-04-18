"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronRight,
  CircleUser,
  Building2,
  Globe,
  LogOut,
  Newspaper,
  Sparkles,
  Trash2,
  Wifi,
  X as XIcon,
  User,
  Edit3,
  Check,
} from "lucide-react";
import { TOPIC_TAXONOMY } from "@/server/taxonomy";
import { TIMEZONES } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import { hasSupabaseRuntimeConfig, SUPABASE_CONFIG_ERROR } from "@/lib/supabase/env";
import { PageShell, ShellCard, ShellHero, ShellSoftCard } from "@/components/page-shell";
import { ThemeToggle } from "@/components/theme-toggle";
import { humanizeSafariTopic, type SafariImportSummary } from "@/lib/safari-insights";
import { clearCachedBrief } from "@/app/(app)/feed/feed-cache";

const sidebarLinks = [
  { href: "/feed", label: "Feed" },
  { href: "/settings", label: "Settings" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Service" },
];

const supabaseConfigured = hasSupabaseRuntimeConfig();

interface LinkedAccountInfo {
  provider: string;
  status: string;
  expires_at: string | null;
  last_sync_at: string | null;
  sync_error_code?: string | null;
  sync_error_at?: string | null;
}

export default function SettingsPage({
  searchParams,
}: {
  searchParams?: Promise<{ connected?: string; error?: string }>;
}) {
  const [connectedParam, setConnectedParam] = useState<string | undefined>();
  const [errorParam, setErrorParam] = useState<string | undefined>();
  const [connectError, setConnectError] = useState<string | null>(null);
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccountInfo[]>([]);
  const [topics, setTopics] = useState<Set<string>>(new Set());
  const [savingTopic, setSavingTopic] = useState<string | null>(null);
  const [profileDisplayName, setProfileDisplayName] = useState("");
  const [profileTimezone, setProfileTimezone] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [briefHour, setBriefHour] = useState(4);
  const [showAllTopics, setShowAllTopics] = useState(false);
  const [activeSection, setActiveSection] = useState("#your-profile");

  // Feedback history
  interface FeedbackItem {
    id: number;
    event_type: "thumbs_up" | "thumbs_down";
    created_at: string;
    article: {
      title: string;
      published_at: string | null;
      canonical_url: string;
      source_name: string;
    } | null;
  }
  const [feedbackHistory, setFeedbackHistory] = useState<FeedbackItem[]>([]);
  const [activeSignalsCount, setActiveSignalsCount] = useState(0);

  // --- Safari History Import state ---
  const [safariImport, setSafariImport] = useState<{
    id: string;
    status: string;
    preview_json: string | null;
    confirmed_at: string | null;
    summary: SafariImportSummary | null;
  } | null>(null);
  const [safariPreview, setSafariPreview] = useState<{
    topDomains: Array<{ domain: string; count: number }>;
    topicCounts: Record<string, number>;
    dateRange: { start: string; end: string };
    totalVisits: number;
    acceptedCount: number;
    rejectedCount: number;
    schemaVersion: number;
  } | null>(null);
  const [safariUploading, setSafariUploading] = useState(false);
  const [safariProcessing, setSafariProcessing] = useState(false);
  const [safariError, setSafariError] = useState<string | null>(null);

  const loadSafariImport = useCallback(async () => {
    try {
      const res = await fetch("/api/history-imports");
      const data = res.ok ? await res.json() : null;
      if (data?.import) {
        const imp = data.import;
        setSafariImport(imp);
        if (imp.status === "preview_ready" && imp.preview_json) {
          try {
            setSafariPreview(JSON.parse(imp.preview_json));
          } catch {
            setSafariPreview(null);
          }
        } else {
          setSafariPreview(null);
        }
      } else {
        setSafariImport(null);
        setSafariPreview(null);
      }
    } catch {
      // Ignore load errors
    }
  }, []);

  useEffect(() => {
    if (searchParams) {
      searchParams.then((sp) => {
        if (sp?.connected) setConnectedParam(sp.connected);
        if (sp?.error) setErrorParam(sp.error);
      });
    }
  }, [searchParams]);

  useEffect(() => {
    fetch("/api/settings/accounts")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.accounts) setLinkedAccounts(data.accounts);
      })
      .catch(() => {});

    fetch("/api/settings/topics")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.preferences) {
          const activeTopics = new Set<string>(
            data.preferences
              .filter((p: { topic: string; weight: number }) => p.weight > 0)
              .map((p: { topic: string }) => p.topic)
          );
          setTopics(activeTopics);
        }
      })
      .catch(() => {});

    fetch("/api/settings/brief-hour")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (typeof data?.hour === "number") setBriefHour(data.hour);
      })
      .catch(() => {});

    void loadSafariImport();

    fetch("/api/settings/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setProfileDisplayName(data.displayName ?? "");
          setProfileTimezone(data.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone);
        }
      })
      .catch(() => {});

    // Fetch feedback history
    fetch("/api/settings/feedback")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.feedback) setFeedbackHistory(data.feedback);
      })
      .catch(() => {});

    // Fetch active signals count
    fetch("/api/settings/active-signals/count")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (typeof data?.count === "number") setActiveSignalsCount(data.count);
      })
      .catch(() => {});
  }, [loadSafariImport]);

  async function toggleTopic(topic: string, checked: boolean) {
    setSavingTopic(topic);
    try {
      const res = await fetch("/api/settings/topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: checked ? "add" : "remove",
          topic,
        }),
      });
      if (res.ok) {
        setTopics((prev) => {
          const next = new Set(prev);
          if (checked) next.add(topic);
          else next.delete(topic);
          return next;
        });
      }
    } catch {
      // Silently fail
    } finally {
      setSavingTopic(null);
    }
  }

  async function handleProfileSave() {
    setSavingProfile(true);
    setProfileSaved(false);
    try {
      const res = await fetch("/api/settings/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: profileDisplayName,
          timezone: profileTimezone,
        }),
      });
      if (res.ok) {
        setProfileSaved(true);
        setTimeout(() => setProfileSaved(false), 3000);
      }
    } catch { /* ignore */ }
    finally {
      setSavingProfile(false);
    }
  }

  async function handleBriefHourChange(hour: number) {
    setBriefHour(hour);
    try {
      const res = await fetch("/api/settings/brief-hour", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hour }),
      });
      if (!res.ok) {
        fetch("/api/settings/brief-hour").then((r) => r.json()).then((d) => {
          if (typeof d?.hour === "number") setBriefHour(d.hour);
        }).catch(() => {});
      }
    } catch {
      fetch("/api/settings/brief-hour").then((r) => r.json()).then((d) => {
        if (typeof d?.hour === "number") setBriefHour(d.hour);
      }).catch(() => {});
    }
  }

  async function handleSafariUpload(file: File) {
    setSafariError(null);
    if (!supabaseConfigured) {
      setSafariError(SUPABASE_CONFIG_ERROR);
      return;
    }
    setSafariUploading(true);
    try {
      const createRes = await fetch("/api/history-imports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name }),
      });
      if (!createRes.ok) {
        const e = await createRes.json();
        throw new Error(e.error || "Failed to create import");
      }
      const { importId, signedUrl, token, path } = await createRes.json();
      if (!signedUrl || !token || !path) {
        throw new Error("Invalid signed upload response from server");
      }
      const signedUrlToken = { signedUrl, token, path };

      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { error } = await supabase.storage
        .from("history-imports-temp")
        .uploadToSignedUrl(signedUrlToken.path, signedUrlToken.token, file);
      if (error) throw new Error(`Storage upload failed: ${error.message}`);

      setSafariUploading(false);
      setSafariProcessing(true);
      const processRes = await fetch(`/api/history-imports/${importId}/process`, {
        method: "POST",
      });
      if (!processRes.ok) {
        const e = await processRes.json();
        throw new Error(e.error || "Processing failed");
      }
      const result = await processRes.json();
      setSafariPreview(result.preview);

      setSafariImport({
        id: importId,
        status: "preview_ready",
        preview_json: null,
        confirmed_at: null,
        summary: null,
      });
    } catch (err: unknown) {
      setSafariError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSafariUploading(false);
      setSafariProcessing(false);
    }
  }

  async function handleSafariConfirm() {
    if (!safariImport?.id) return;
    setSafariError(null);
    try {
      const res = await fetch(`/api/history-imports/${safariImport.id}/confirm`, {
        method: "POST",
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error || "Confirm failed");
      }
      await loadSafariImport();
    } catch (err: unknown) {
      setSafariError(err instanceof Error ? err.message : "Unknown error");
    }
  }

  async function handleSafariDelete() {
    if (!safariImport?.id) return;
    setSafariError(null);
    try {
      const res = await fetch(`/api/history-imports/${safariImport.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error || "Delete failed");
      }
      await loadSafariImport();
    } catch (err: unknown) {
      setSafariError(err instanceof Error ? err.message : "Unknown error");
    }
  }

  // Track active section for sidebar nav highlighting
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(`#${entry.target.id}`);
          }
        });
      },
      { rootMargin: "-20% 0px -60% 0px" }
    );
    sectionLinks.forEach((s) => {
      const el = document.querySelector(s.href);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const activeAccountCount = linkedAccounts.filter(
    (account) => account.status === "active"
  ).length;
  const briefHourLabel = `${briefHour.toString().padStart(2, "0")}:00`;
  const profileReady = profileDisplayName.trim().length > 0;
  const safariStatusLabel =
    safariImport?.status === "confirmed"
      ? "Imported"
      : safariImport?.status === "preview_ready"
        ? "Preview ready"
        : "Pending";
  const sectionLinks = [
    { href: "#your-profile", label: "Profile" },
    { href: "#appearance", label: "Appearance" },
    { href: "#safari-history-import", label: "Safari import" },
    { href: "#linked-accounts", label: "Accounts" },
    { href: "#brief-delivery-time", label: "Brief time" },
    { href: "#topic-preferences", label: "Topics" },
    { href: "#feedback-history", label: "Feedback History" },
    { href: "#privacy", label: "Privacy" },
    { href: "#danger-zone", label: "Danger zone" },
  ];

  const displayName = profileDisplayName.trim() || "there";

  async function handleSignOut() {
    clearCachedBrief();
    if (!supabaseConfigured) {
      window.location.href = "/login";
      return;
    }
    try {
      const browserClient = createClient();
      await browserClient.auth.signOut();
    } catch {
      // ignore
    }
    try {
      await fetch("/api/auth/sign-out", { method: "POST" });
    } catch {
      // ignore
    }
    window.location.href = "/login";
  }

  return (
    <PageShell
      shellClassName="lg:grid-cols-[270px_minmax(0,1fr)]"
      contentClassName="space-y-5"
      sidebar={
        <SettingsSidebar
          activeAccountCount={activeAccountCount}
          activeSignalsCount={activeSignalsCount}
          briefHourLabel={briefHourLabel}
          profileReady={profileReady}
          safariStatusLabel={safariStatusLabel}
          topicCount={topics.size}
          topicHighlights={Array.from(topics)}
          activeSection={activeSection}
        />
      }
    >
      {/* ── Hero ──────────────────────────────────────── */}
      <ShellHero>
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p
              className="font-body text-xs font-medium uppercase tracking-widest"
              style={{ color: "var(--ds-text-dim)" }}
            >
              Settings &mdash; {displayName}
            </p>
            <h1
              className="font-display mt-2 text-[clamp(1.6rem,3.2vw,2.4rem)] font-semibold leading-[1.15] tracking-tight"
              style={{ color: "var(--ds-text)" }}
            >
              Control your briefing, connections, and privacy.
            </h1>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:w-[280px]">
            <MetricCard label="Accounts" value={activeAccountCount} detail="linked" />
            <MetricCard label="Topics" value={topics.size} detail="active" />
            <MetricCard label="Signals" value={activeSignalsCount} detail="active now" />
          </div>
        </div>
      </ShellHero>

      {/* ── Section tabs ──────────────────────────────── */}
      <ShellSoftCard className="px-2 py-2">
        <div className="flex gap-1.5 overflow-x-auto">
          {sectionLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="inline-flex shrink-0 items-center rounded-full px-4 py-2 text-sm font-medium transition-colors"
              style={{
                color: "var(--ds-text-muted)",
                ...(activeSection === link.href
                  ? {
                      backgroundColor: "var(--ds-accent-soft)",
                      color: "var(--ds-accent)",
                    }
                  : {}),
              }}
            >
              {link.label}
            </a>
          ))}
        </div>
      </ShellSoftCard>

      {/* ── Config banners ────────────────────────────── */}
      {!supabaseConfigured && (
        <ShellCard className="border-amber-400/30 p-4">
          <p
            className="text-sm leading-relaxed"
            style={{ color: "var(--ds-text-muted)" }}
          >
            Authentication is not configured for this deployment yet. Set the
            Supabase production env vars in Vercel and redeploy before using
            profile sync, Safari import, or sign-out.
          </p>
        </ShellCard>
      )}

      {connectedParam && (
        <div
          className="motion-fade-up rounded-[12px] border px-4 py-3 text-sm"
          style={{
            backgroundColor: "var(--ds-accent-soft)",
            borderColor: "var(--ds-accent)",
            color: "var(--ds-accent)",
          }}
        >
          Connected to {connectedParam === "x" ? "X / Twitter" : "Google"}{" "}
          successfully! Your signals will now influence your daily briefing.
        </div>
      )}
      {errorParam && (
        <div
          className="motion-fade-up rounded-[12px] border px-4 py-3 text-sm"
          style={{
            borderColor: "rgba(239,68,68,0.35)",
            color: "#ef4444",
          }}
        >
          Connection failed: {decodeURIComponent(errorParam)}
        </div>
      )}
      {connectError && (
        <div
          className="motion-fade-up rounded-[12px] border px-4 py-3 text-sm"
          style={{
            borderColor: "rgba(239,68,68,0.35)",
            color: "#ef4444",
          }}
        >
          {connectError}
          <button onClick={() => setConnectError(null)} className="ml-2 underline">
            Dismiss
          </button>
        </div>
      )}

      {/* ── Profile ───────────────────────────────────── */}
      <section id="your-profile" className="scroll-mt-8">
        <ShellCard className="p-6">
          <div className="mb-5 flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-[10px]"
              style={{
                backgroundColor: "var(--ds-surface-2)",
              }}
            >
              <User className="h-5 w-5" style={{ color: "var(--ds-accent)" }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--ds-text)" }}>
                Display name &amp; timezone
              </p>
              <p className="text-xs" style={{ color: "var(--ds-text-dim)" }}>
                Customize how your briefing addresses you
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="profile-display-name"
                className="mb-1.5 block text-sm font-medium"
                style={{ color: "var(--ds-text-muted)" }}
              >
                Display Name
              </label>
              <input
                id="profile-display-name"
                type="text"
                value={profileDisplayName}
                onChange={(e) => setProfileDisplayName(e.target.value)}
                placeholder="How should we greet you?"
                maxLength={50}
                className="ds-input w-full"
              />
            </div>

            <div>
              <label
                htmlFor="profile-timezone"
                className="mb-1.5 block text-sm font-medium"
                style={{ color: "var(--ds-text-muted)" }}
              >
                Timezone
              </label>
              <select
                id="profile-timezone"
                value={profileTimezone}
                onChange={(e) => setProfileTimezone(e.target.value)}
                className="ds-select w-full"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleProfileSave}
                disabled={savingProfile}
                className="ds-btn"
              >
                {savingProfile ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current opacity-30 border-t-current" />
                    Saving&hellip;
                  </>
                ) : profileSaved ? (
                  <>
                    <Check className="h-4 w-4" />
                    Saved
                  </>
                ) : (
                  <>
                    <Edit3 className="h-4 w-4" />
                    Save Profile
                  </>
                )}
              </button>
            </div>
          </div>
        </ShellCard>
      </section>

      {/* ── Appearance ────────────────────────────────── */}
      <section id="appearance" className="scroll-mt-8">
        <ShellCard className="p-6">
          <div className="mb-5">
            <h2 className="text-lg font-semibold tracking-tight" style={{ color: "var(--ds-text)" }}>
              Appearance
            </h2>
            <p className="mt-1 text-sm leading-relaxed" style={{ color: "var(--ds-text-muted)" }}>
              Switch between light and dark mode. Your preference syncs across
              devices.
            </p>
          </div>
          <ThemeToggle />
        </ShellCard>
      </section>

      {/* ── Safari History Import ─────────────────────── */}
      <section id="safari-history-import" className="scroll-mt-8">
        <ShellCard className="p-6">
          <div className="mb-5">
            <h2 className="text-lg font-semibold tracking-tight" style={{ color: "var(--ds-text)" }}>
              Safari History Import
            </h2>
            <p className="mt-1 text-sm leading-relaxed" style={{ color: "var(--ds-text-muted)" }}>
              Strengthen your profile with Safari history. Safari ZIP only &mdash;
              passwords, cards, bookmarks ignored. Raw file deleted after
              processing.
            </p>
          </div>
          <SafariImportSection
            safariImport={safariImport}
            safariPreview={safariPreview}
            uploading={safariUploading}
            processing={safariProcessing}
            error={safariError}
            onUpload={(file) => handleSafariUpload(file)}
            onConfirm={handleSafariConfirm}
            onDelete={handleSafariDelete}
            onError={setSafariError}
          />
        </ShellCard>
      </section>

      {/* ── Linked Accounts ───────────────────────────── */}
      <section id="linked-accounts" className="scroll-mt-8">
        <ShellCard className="p-6">
          <div className="mb-5">
            <h2 className="text-lg font-semibold tracking-tight" style={{ color: "var(--ds-text)" }}>
              Linked Accounts
            </h2>
            <p className="mt-1 text-sm leading-relaxed" style={{ color: "var(--ds-text-muted)" }}>
              Connected sources and future integrations will live here.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <ComingSoonCard
              Icon={XIcon}
              label="X / Twitter"
              description="Temporarily disabled during auth refinement"
            />
            <ComingSoonCard
              Icon={Wifi}
              label="Google"
              description="Temporarily disabled during auth refinement"
            />
            <ComingSoonCard
              Icon={CircleUser}
              label="Facebook"
              description="Not yet supported &mdash; coming soon"
            />
            <ComingSoonCard
              Icon={Building2}
              label="Microsoft"
              description="Not yet supported &mdash; coming soon"
            />
          </div>
        </ShellCard>
      </section>

      {/* ── Brief Delivery Time ───────────────────────── */}
      <section id="brief-delivery-time" className="scroll-mt-8">
        <ShellCard className="p-6">
          <div className="mb-5">
            <h2 className="text-lg font-semibold tracking-tight" style={{ color: "var(--ds-text)" }}>
              Brief Delivery Time
            </h2>
            <p className="mt-1 text-sm leading-relaxed" style={{ color: "var(--ds-text-muted)" }}>
              Set the local hour when your daily briefing will be ready. Your
              brief is generated shortly before this time.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label htmlFor="brief-hour" className="text-sm" style={{ color: "var(--ds-text-muted)" }}>
              Brief ready at:
            </label>
            <select
              id="brief-hour"
              value={briefHour}
              onChange={(e) => handleBriefHourChange(parseInt(e.target.value, 10))}
              className="ds-select"
            >
              {Array.from({ length: 24 }, (_, h) => {
                const display12 =
                  h === 0
                    ? "12 AM"
                    : h < 12
                      ? `${h} AM`
                      : h === 12
                        ? "12 PM"
                        : `${h - 12} PM`;
                return (
                  <option key={h} value={h}>
                    {h}:00 {display12}
                  </option>
                );
              })}
            </select>
            <span className="text-xs" style={{ color: "var(--ds-text-dim)" }}>local time</span>
          </div>
        </ShellCard>
      </section>

      {/* ── Topic Preferences ─────────────────────────── */}
      <section id="topic-preferences" className="scroll-mt-8">
        <ShellCard className="p-6">
          <div className="mb-5">
            <h2 className="text-lg font-semibold tracking-tight" style={{ color: "var(--ds-text)" }}>
              Topic Preferences
            </h2>
            <p className="mt-1 text-sm leading-relaxed" style={{ color: "var(--ds-text-muted)" }}>
              These topics influence which articles appear in your briefing. We
              auto-detect interests from your linked accounts. You can also
              adjust weights manually.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {TOPIC_TAXONOMY.map((topic) => {
              if (!showAllTopics && !topics.has(topic)) return null;
              return (
                <TopicBadge
                  key={topic}
                  topic={topic}
                  checked={topics.has(topic)}
                  disabled={savingTopic === topic}
                  onChange={toggleTopic}
                />
              );
            })}
          </div>
          {!showAllTopics && (
            <button
              onClick={() => setShowAllTopics(true)}
              className="mt-3 text-sm underline decoration-zinc-400 underline-offset-4 transition hover:text-strong"
              style={{ color: "var(--ds-text-dim)" }}
            >
              Show all {TOPIC_TAXONOMY.length} topics
            </button>
          )}
        </ShellCard>
      </section>

      {/* ── Feedback History ────────────────────────────── */}
      <section id="feedback-history" className="scroll-mt-8">
        <ShellCard className="p-6">
          <div className="mb-5">
            <h2 className="text-lg font-semibold tracking-tight" style={{ color: "var(--ds-text)" }}>
              Feedback History
            </h2>
            <p className="mt-1 text-sm leading-relaxed" style={{ color: "var(--ds-text-muted)" }}>
              Review the articles you&apos;ve rated. This feedback directly shapes your future personalization signals.
            </p>
          </div>

          {feedbackHistory.length === 0 ? (
            <p className="text-sm italic" style={{ color: "var(--ds-text-dim)" }}>
              No feedback given yet. Rate articles in your feed to see them here.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--ds-border)" }}>
                    <th className="pb-2 font-medium w-28" style={{ color: "var(--ds-text-muted)" }}>
                      Rating
                    </th>
                    <th className="pb-2 font-medium" style={{ color: "var(--ds-text-muted)" }}>
                      Article
                    </th>
                    <th className="pb-2 font-medium whitespace-nowrap" style={{ color: "var(--ds-text-muted)" }}>
                      Published
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {feedbackHistory.map((item) => (
                    <tr key={item.id} style={{ borderBottom: "1px solid var(--ds-border)" }}>
                      <td className="py-3 pr-4 align-top">
                        {item.event_type === "thumbs_up" ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium" style={{ color: "#10b981" }}>
                            Liked
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium" style={{ color: "#ef4444" }}>
                            Disliked
                          </span>
                        )}
                      </td>
                      <td className="py-3 pr-4 align-top">
                        {item.article ? (
                          <>
                            <a
                              href={item.article.canonical_url}
                              target="_blank"
                              rel="noreferrer"
                              className="font-medium hover:underline"
                              style={{ color: "var(--ds-text)" }}
                            >
                              {item.article.title}
                            </a>
                            {item.article.source_name && (
                              <div className="text-xs mt-1" style={{ color: "var(--ds-text-dim)" }}>
                                {item.article.source_name}
                              </div>
                            )}
                          </>
                        ) : (
                          <span style={{ color: "var(--ds-text-dim)" }}>
                            Article unavailable
                          </span>
                        )}
                      </td>
                      <td className="py-3 align-top text-xs whitespace-nowrap" style={{ color: "var(--ds-text-dim)" }}>
                        {item.article?.published_at
                          ? new Date(item.article.published_at).toLocaleDateString(undefined, {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })
                          : "Unknown"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ShellCard>
      </section>

      {/* ── Privacy ───────────────────────────────────── */}
      <section id="privacy" className="scroll-mt-8">
        <ShellCard className="p-6">
          <div className="mb-5">
            <h2 className="text-lg font-semibold tracking-tight" style={{ color: "var(--ds-text)" }}>
              Privacy
            </h2>
          </div>
          <div className="space-y-3 text-sm leading-relaxed" style={{ color: "var(--ds-text-muted)" }}>
            <p>
              We encrypt your OAuth tokens using AES-256-GCM at rest. Your
              tokens are never stored in plaintext.
            </p>
            <p>
              Disconnecting an account immediately purges all encrypted tokens
              associated with it. Your personalization signals from that
              account will stop being used, though historical feedback data is
              retained for quality purposes.
            </p>
            <p>
              We do not sell, share, or resell your data. Your reading
              interests are used solely to curate your briefing.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                href="/privacy"
                className="ds-link-card"
              >
                Privacy Policy
                <ChevronRight className="h-4 w-4" />
              </Link>
              <Link
                href="/terms"
                className="ds-link-card"
              >
                Terms of Service
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </ShellCard>
      </section>

      {/* ── Danger Zone ───────────────────────────────── */}
      <section id="danger-zone" className="scroll-mt-8">
        <ShellCard
          className="p-6"
        >
          <style jsx>{`
            #danger-zone > section {
              border-color: rgba(239, 68, 68, 0.25) !important;
            }
          `}</style>
          <div className="mb-5">
            <h2 className="text-lg font-semibold tracking-tight" style={{ color: "#ef4444" }}>
              Danger Zone
            </h2>
            <p className="mt-1 text-sm leading-relaxed" style={{ color: "var(--ds-text-muted)" }}>
              Permanently delete your account and all associated data. This
              includes your profile, linked accounts, topic preferences, daily
              briefs, interest signals, and feedback events. This action cannot
              be undone.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleSignOut}
              className="ds-btn-secondary"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
            <DeleteAccountButton />
          </div>
        </ShellCard>
      </section>
    </PageShell>
  );
}

// ── Shared primitives ────────────────────────────────────────

function MetricCard({
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
      <p
        className="text-[10px] font-semibold uppercase tracking-widest"
        style={{ color: "var(--ds-text-dim)" }}
      >
        {label}
      </p>
      <p
        className="mt-1.5 text-xl font-semibold tracking-tight"
        style={{ color: "var(--ds-text)" }}
      >
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

function SettingsSidebar({
  activeAccountCount,
  activeSignalsCount,
  briefHourLabel,
  profileReady,
  safariStatusLabel,
  topicCount,
  topicHighlights,
  activeSection,
}: {
  activeAccountCount: number;
  activeSignalsCount: number;
  briefHourLabel: string;
  profileReady: boolean;
  safariStatusLabel: string;
  topicCount: number;
  topicHighlights: string[];
  activeSection: string;
}) {
  return (
    <div className="hidden lg:block">
      <div
        className="sticky top-0 flex max-h-[calc(100vh-2rem)] flex-col gap-5 overflow-hidden rounded-[12px] border p-5"
        style={{
          backgroundColor: "var(--ds-surface-1)",
          borderColor: "var(--ds-border)",
        }}
      >
        {/* Brand */}
        <div className="inline-flex items-center gap-3">
          <span
            className="inline-flex h-10 w-10 items-center justify-center rounded-[10px]"
            style={{
              backgroundColor: "var(--ds-accent)",
            }}
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
            <p className="text-sm" style={{ color: "var(--ds-text-dim)" }}>Settings hub</p>
          </div>
        </div>

        {/* Stat tiles */}
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-3">
            <MetricCard label="Accounts" value={activeAccountCount} detail="linked" />
            <MetricCard label="Topics" value={topicCount} detail="active" />
          </div>
          <MetricCard label="Signals" value={activeSignalsCount} detail="active now" />
        </div>

        {/* Nav */}
        <nav className="space-y-1">
          {sidebarLinks.map((link) => {
            const active = link.href === "/settings";
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

        {/* Personalization panel */}
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
              <dt style={{ color: "var(--ds-text-dim)" }}>Profile</dt>
              <dd className="font-medium" style={{ color: "var(--ds-text)" }}>
                {profileReady ? "Ready" : "Unset"}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt style={{ color: "var(--ds-text-dim)" }}>Brief time</dt>
              <dd className="font-medium" style={{ color: "var(--ds-text)" }}>
                {briefHourLabel}
              </dd>
            </div>
          </dl>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span
              className="rounded-full border px-2.5 py-0.5 text-[10px] font-medium"
              style={{
                color: "var(--ds-text-dim)",
                borderColor: "var(--ds-border)",
                backgroundColor: "var(--ds-surface-1)",
              }}
            >
              {safariStatusLabel}
            </span>
            {topicCount > 0 && (
              <span
                className="rounded-full border px-2.5 py-0.5 text-[10px] font-medium"
                style={{
                  color: "var(--ds-text-dim)",
                  borderColor: "var(--ds-border)",
                  backgroundColor: "var(--ds-surface-1)",
                }}
              >
                {topicCount} topics
              </span>
            )}
            {topicHighlights.slice(0, 2).map((topic) => (
              <span
                key={topic}
                className="rounded-full border px-2.5 py-0.5 text-[10px] font-medium"
                style={{
                  color: "var(--ds-text-dim)",
                  borderColor: "var(--ds-border)",
                  backgroundColor: "var(--ds-surface-1)",
                }}
              >
                {topic.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        </section>

        {/* Theme toggle at bottom */}
        <div
          className="mt-auto pt-4"
          style={{ borderTop: "1px solid var(--ds-border)" }}
        >
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}

function ComingSoonCard({
  Icon,
  label,
  description,
}: {
  Icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  description: string;
}) {
  return (
    <div
      className="flex items-center justify-between rounded-[10px] border border-dashed p-4"
      style={{
        borderColor: "var(--ds-border)",
        backgroundColor: "var(--ds-surface-1)",
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="rounded-[10px] p-2"
          style={{
            backgroundColor: "var(--ds-surface-2)",
          }}
        >
          <Icon className="h-4 w-4" style={{ color: "var(--ds-accent)" }} />
        </div>
        <div>
          <p className="text-sm font-medium" style={{ color: "var(--ds-text)" }}>
            {label}
          </p>
          <p className="text-xs" style={{ color: "var(--ds-text-dim)" }}>
            {description}
          </p>
        </div>
      </div>
      <span className="text-xs italic" style={{ color: "var(--ds-text-dim)" }}>Coming soon</span>
    </div>
  );
}

function TopicBadge({
  topic,
  checked,
  disabled,
  onChange,
}: {
  topic: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (topic: string, checked: boolean) => void;
}) {
  const formatted = topic
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <label
      className="ds-topic-pill group flex cursor-pointer items-center gap-2 rounded-full px-3 py-1.5 text-sm transition-colors"
      style={{
        backgroundColor: checked ? "var(--ds-accent-soft)" : "var(--ds-surface-1)",
        borderColor: checked ? "var(--ds-accent)" : "var(--ds-border)",
        color: checked ? "var(--ds-accent)" : "var(--ds-text-muted)",
        cursor: disabled ? "wait" : "pointer",
        borderWidth: checked ? "1px" : undefined,
        borderStyle: "solid",
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(topic, e.target.checked)}
        className="ds-checkbox mr-1 cursor-pointer accent-[var(--ds-accent)]"
      />
      <span>{formatted}</span>
    </label>
  );
}

function DeleteAccountButton() {
  const [isPending, setIsPending] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!confirmed) {
      setConfirmed(true);
      return;
    }
    setIsPending(true);
    setError(null);
    try {
      const res = await fetch("/api/accounts/delete", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        window.location.href = "/";
      } else {
        setError(data.error ?? "Failed to delete account");
        setIsPending(false);
        setConfirmed(false);
      }
    } catch {
      setError("Network error. Please try again.");
      setIsPending(false);
      setConfirmed(false);
    }
  };

  return (
    <div>
      {!confirmed ? (
        <button
          onClick={handleDelete}
          className="rounded-[10px] px-4 py-2.5 text-sm font-medium transition-colors"
          style={{
            backgroundColor: "rgba(239,68,68,0.15)",
            color: "#ef4444",
          }}
        >
          Delete Account
        </button>
      ) : (
        <div className="space-y-3">
          <p className="text-sm font-semibold" style={{ color: "#ef4444" }}>
            Are you sure? Click below to permanently delete your account.
          </p>
          {error && <p className="text-sm" style={{ color: "#ef4444" }}>{error}</p>}
          <div className="flex gap-3">
            <button
              onClick={handleDelete}
              disabled={isPending}
              className="rounded-[10px] px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
              style={{
                backgroundColor: "#ef4444",
                color: "#fff",
              }}
            >
              {isPending ? "Deleting..." : "Yes, Delete Account"}
            </button>
            <button
              onClick={() => {
                setConfirmed(false);
                setError(null);
              }}
              disabled={isPending}
              className="rounded-[10px] border px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
              style={{
                borderColor: "var(--ds-border)",
                backgroundColor: "var(--ds-surface-1)",
                color: "var(--ds-text-muted)",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface SafariPreviewData {
  topDomains: Array<{ domain: string; count: number }>;
  topicCounts: Record<string, number>;
  dateRange: { start: string; end: string };
  totalVisits: number;
  acceptedCount: number;
  rejectedCount: number;
  schemaVersion: number;
}

function SafariImportSection({
  safariImport,
  safariPreview,
  uploading,
  processing,
  error,
  onUpload,
  onConfirm,
  onDelete,
  onError,
}: {
  safariImport: {
    id: string;
    status: string;
    preview_json: string | null;
    confirmed_at: string | null;
    summary: SafariImportSummary | null;
  } | null;
  safariPreview: SafariPreviewData | null;
  uploading: boolean;
  processing: boolean;
  error: string | null;
  onUpload: (file: File) => void;
  onConfirm: () => void;
  onDelete: () => void;
  onError: (msg: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".zip")) {
      onError("Please upload a .zip file");
      return;
    }
    onUpload(file);
    e.target.value = "";
  };

  if (safariImport?.status === "confirmed") {
    const summary = safariImport.summary;
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm" style={{ color: "var(--ds-accent)" }}>
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="font-medium">History imported successfully</span>
        </div>
        <p className="text-xs" style={{ color: "var(--ds-text-dim)" }}>
          Safari history signals are influencing your daily brief.
        </p>
        {summary ? (
          <div
            className="rounded-[10px] border p-4"
            style={{
              backgroundColor: "var(--ds-surface-2)",
              borderColor: "var(--ds-border)",
            }}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="max-w-2xl">
                <p
                  className="text-[10px] font-semibold uppercase tracking-widest"
                  style={{ color: "var(--ds-text-dim)" }}
                >
                  Safari profile summary
                </p>
                <p className="mt-2 text-sm leading-6" style={{ color: "var(--ds-text)" }}>
                  {summary.behaviorBlurb}
                </p>
              </div>
              <div
                className="rounded-full border px-3 py-1 text-xs font-medium"
                style={{
                  backgroundColor: "var(--ds-surface-1)",
                  borderColor: "var(--ds-border)",
                  color: "var(--ds-text)",
                }}
              >
                {summary.acceptedCount.toLocaleString()} accepted visits
              </div>
            </div>

            {summary.topTopics.length > 0 && (
              <div className="mt-4">
                <h3
                  className="mb-2 text-[10px] font-semibold uppercase tracking-widest"
                  style={{ color: "var(--ds-text-dim)" }}
                >
                  Top interests
                </h3>
                <div className="flex flex-wrap gap-2">
                  {summary.topTopics.map((item) => (
                    <span
                      key={item.topic}
                      className="rounded-full border px-2.5 py-1 text-xs"
                      style={{
                        backgroundColor: "var(--ds-surface-1)",
                        borderColor: "var(--ds-border)",
                        color: "var(--ds-text)",
                      }}
                    >
                      {humanizeSafariTopic(item.topic)} ({item.count})
                    </span>
                  ))}
                </div>
              </div>
            )}

            {summary.topDomains.length > 0 && (
              <div className="mt-4">
                <h3
                  className="mb-2 text-[10px] font-semibold uppercase tracking-widest"
                  style={{ color: "var(--ds-text-dim)" }}
                >
                  Top domains
                </h3>
                <div className="flex flex-wrap gap-2">
                  {summary.topDomains.map((item) => (
                    <span
                      key={item.domain}
                      className="rounded-full border px-2.5 py-1 text-xs"
                      style={{
                        backgroundColor: "var(--ds-surface-1)",
                        borderColor: "var(--ds-border)",
                        color: "var(--ds-text)",
                      }}
                    >
                      {item.domain}
                      <span style={{ color: "var(--ds-text-dim)" }}> ({item.count})</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}
        <div className="flex flex-wrap gap-3 pt-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="ds-btn"
          >
            Replace Import
          </button>
          <button
            onClick={onDelete}
            className="rounded-[10px] border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-red-500/10"
            style={{
              borderColor: "rgba(239,68,68,0.25)",
              backgroundColor: "rgba(239,68,68,0.05)",
              color: "#ef4444",
            }}
          >
            <span className="inline-flex items-center gap-1.5">
              <Trash2 className="h-4 w-4" />
              Delete History Signals
            </span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".zip"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </div>
    );
  }

  if (safariImport?.status === "preview_ready" && safariPreview) {
    const preview = safariPreview;
    const topTopics = Object.entries(preview.topicCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([topic, count]) => ({ topic, count }));

    return (
      <div className="space-y-4">
        <div className="grid gap-3 text-sm sm:grid-cols-3">
          <MiniStat value={preview.totalVisits.toLocaleString()} label="Total Visits" />
          <MiniStat value={preview.acceptedCount.toLocaleString()} label="Accepted" />
          <MiniStat value={preview.rejectedCount.toLocaleString()} label="Rejected" />
        </div>

        <div>
          <h3 className="mb-2 text-sm font-medium" style={{ color: "var(--ds-text-muted)" }}>
            Top Domains
          </h3>
          <div className="flex flex-wrap gap-2">
            {preview.topDomains.slice(0, 10).map((d) => (
              <span
                key={d.domain}
                className="rounded-full border px-2.5 py-1 text-xs"
                style={{
                  backgroundColor: "var(--ds-surface-2)",
                  borderColor: "var(--ds-border)",
                  color: "var(--ds-text)",
                }}
              >
                {d.domain}{" "}
                <span style={{ color: "var(--ds-text-dim)" }}>({d.count})</span>
              </span>
            ))}
          </div>
        </div>

        {topTopics.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-medium" style={{ color: "var(--ds-text-muted)" }}>
              Inferred Topics
            </h3>
            <div className="flex flex-wrap gap-2">
              {topTopics.map((t) => {
                const display = t.topic
                  .replace(/_/g, " ")
                  .replace(/\b\w/g, (c) => c.toUpperCase());
                return (
                  <span
                    key={t.topic}
                    className="rounded-full border px-2.5 py-1 text-xs"
                    style={{
                      backgroundColor: "var(--ds-accent-soft)",
                      borderColor: "var(--ds-accent)",
                      color: "var(--ds-accent)",
                    }}
                  >
                    {display}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        <p className="text-xs" style={{ color: "var(--ds-text-dim)" }}>
          Date range: {new Date(preview.dateRange.start).toLocaleDateString()} &rarr;{" "}
          {new Date(preview.dateRange.end).toLocaleDateString()}
        </p>

        {error && <p className="text-sm" style={{ color: "#ef4444" }}>{error}</p>}

        <div className="flex flex-wrap gap-3 pt-2">
          <button onClick={onConfirm} className="ds-btn">
            Confirm Import
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="ds-btn-secondary"
          >
            Cancel / Re-upload
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".zip"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {uploading && (
        <div className="flex items-center gap-3 text-sm" style={{ color: "var(--ds-text-muted)" }}>
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-current opacity-30 border-t-current">
            <span className="sr-only">Uploading...</span>
          </div>
          <span>Uploading...</span>
        </div>
      )}
      {processing && (
        <div className="flex items-center gap-3 text-sm" style={{ color: "var(--ds-text-muted)" }}>
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-current opacity-30 border-t-current">
            <span className="sr-only">Processing your Safari history...</span>
          </div>
          <span>Processing your Safari history...</span>
        </div>
      )}
      {error && <p className="text-sm" style={{ color: "#ef4444" }}>{error}</p>}

      {!uploading && !processing && (
        <button
          onClick={() => fileInputRef.current?.click()}
          className="ds-btn"
        >
          <Globe className="h-4 w-4" />
          Upload Safari Export ZIP
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".zip"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}

function MiniStat({ value, label }: { value: string; label: string }) {
  return (
    <div
      className="rounded-[10px] border px-3 py-3 text-center"
      style={{
        backgroundColor: "var(--ds-surface-2)",
        borderColor: "var(--ds-border)",
      }}
    >
      <div className="text-lg font-semibold tracking-tight" style={{ color: "var(--ds-text)" }}>
        {value}
      </div>
      <div className="text-xs" style={{ color: "var(--ds-text-dim)" }}>{label}</div>
    </div>
  );
}
