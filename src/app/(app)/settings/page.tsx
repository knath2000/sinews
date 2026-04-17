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

const sidebarLinks = [
  { href: "/feed", label: "Feed" },
  { href: "/settings", label: "Settings" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
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
  // Profile editing state
  const [profileDisplayName, setProfileDisplayName] = useState("");
  const [profileTimezone, setProfileTimezone] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [briefHour, setBriefHour] = useState(4);
  const [showAllTopics, setShowAllTopics] = useState(false);

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
      // Ignore load errors; the rest of the page still works.
    }
  }, []);

  // Resolve search params once on client
  useEffect(() => {
    if (searchParams) {
      searchParams.then((sp) => {
        if (sp?.connected) setConnectedParam(sp.connected);
        if (sp?.error) setErrorParam(sp.error);
      });
    }
  }, [searchParams]);

  // Load accounts + topics + brief hour + safari import on mount
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
  }, [loadSafariImport]);

  // Topic toggle handler
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
      // Silently fail – user can retry
    } finally {
      setSavingTopic(null);
    }
  }

  // Profile edit handler
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
        // Revert on failure
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

  // --- Safari History Import handlers ---
  async function handleSafariUpload(file: File) {
    setSafariError(null);
    if (!supabaseConfigured) {
      setSafariError(SUPABASE_CONFIG_ERROR);
      return;
    }
    setSafariUploading(true);
    try {
      // Step 1: Create import record + get upload URL
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

      // Step 2: Upload ZIP using Supabase browser client with signed URL
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { error } = await supabase.storage
        .from("history-imports-temp")
        .uploadToSignedUrl(signedUrlToken.path, signedUrlToken.token, file);
      if (error) throw new Error(`Storage upload failed: ${error.message}`);

      // Step 3: Process the ZIP server-side
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

      // Refresh import status
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
    { href: "#privacy", label: "Privacy" },
    { href: "#danger-zone", label: "Danger zone" },
  ];

  async function handleSignOut() {
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
          briefHourLabel={briefHourLabel}
          profileReady={profileReady}
          safariStatusLabel={safariStatusLabel}
          topicCount={topics.size}
          topicHighlights={Array.from(topics)}
        />
      }
    >
      <ShellHero className="px-6 py-6 sm:px-8 sm:py-7">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--surface-border-white)] bg-[var(--surface-card-bg)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.32em] text-panel-label shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              Settings
            </div>
            <h1 className="mt-4 text-[clamp(2rem,3.8vw,3.1rem)] font-semibold tracking-tight text-strong">
              Control your briefing, connections, and privacy.
            </h1>
            <p className="text-muted mt-3 max-w-2xl text-base leading-relaxed sm:text-lg">
              Manage your linked accounts, topic preferences, Safari import,
              and delivery time from one place.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:w-[320px]">
            <StatBlock
              label="Accounts"
              value={activeAccountCount}
              detail="linked sources"
            />
            <StatBlock
              label="Topics"
              value={topics.size}
              detail="active now"
            />
          </div>
        </div>
      </ShellHero>

      <ShellSoftCard className="p-2">
        <div className="flex gap-2 overflow-x-auto">
          {sectionLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-strong inline-flex shrink-0 items-center rounded-full border px-4 py-2 text-sm font-medium transition hover:-translate-y-0.5 hover:bg-white/70 hover:shadow-sm dark:hover:bg-zinc-800/80"
              style={{
                borderColor: "var(--surface-border-white)",
                backgroundColor: "var(--surface-card-bg)",
              }}
            >
              {link.label}
            </a>
          ))}
        </div>
      </ShellSoftCard>

      {!supabaseConfigured && (
        <div className="rounded-[var(--radius-card)] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-sm dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
          Authentication is not configured for this deployment yet. Set the
          Supabase production env vars in Vercel and redeploy before using
          profile sync, Safari import, or sign-out.
        </div>
      )}

      {connectedParam && (
        <div
          className="motion-fade-up rounded-[var(--radius-card)] border px-4 py-4 text-sm text-emerald-700 shadow-sm dark:text-emerald-200"
          style={{
            background: "rgba(16,185,129,0.10)",
            borderColor: "rgba(16,185,129,0.22)",
          }}
        >
          Connected to {connectedParam === "x" ? "X / Twitter" : "Google"}{" "}
          successfully! Your signals will now influence your daily briefing.
        </div>
      )}
      {errorParam && (
        <div
          className="motion-fade-up rounded-[var(--radius-card)] border px-4 py-4 text-sm text-red-700 shadow-sm dark:text-red-200"
          style={{
            background: "rgba(244,63,94,0.10)",
            borderColor: "rgba(239,68,68,0.22)",
          }}
        >
          Connection failed: {decodeURIComponent(errorParam)}
        </div>
      )}
      {connectError && (
        <div
          className="motion-fade-up rounded-[var(--radius-card)] border px-4 py-4 text-sm text-red-700 shadow-sm dark:text-red-200"
          style={{
            background: "rgba(244,63,94,0.10)",
            borderColor: "rgba(239,68,68,0.22)",
          }}
        >
          {connectError}
          <button onClick={() => setConnectError(null)} className="ml-2 underline">
            Dismiss
          </button>
        </div>
      )}

      <section id="your-profile" className="scroll-mt-8">
        <ShellCard className="p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-950 shadow-sm dark:bg-zinc-100 dark:text-zinc-950">
              <User className="h-6 w-6 text-sky-600" />
            </div>
            <div>
              <p className="text-strong text-sm font-medium">
                Display name &amp; timezone
              </p>
              <p className="text-muted text-xs">
                Customize how your briefing addresses you
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="profile-display-name"
                className="text-panel-label mb-1.5 block text-sm font-medium"
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
                className="w-full rounded-[1.15rem] border px-4 py-3 text-sm text-strong shadow-sm outline-none transition placeholder:text-subtle focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/20"
                style={{
                  backgroundColor: "var(--surface-status-bg)",
                  borderColor: "var(--surface-border-white)",
                }}
              />
            </div>

            <div>
              <label
                htmlFor="profile-timezone"
                className="text-panel-label mb-1.5 block text-sm font-medium"
              >
                Timezone
              </label>
              <select
                id="profile-timezone"
                value={profileTimezone}
                onChange={(e) => setProfileTimezone(e.target.value)}
                className="w-full rounded-[1.15rem] border px-4 py-3 text-sm text-strong shadow-sm outline-none transition focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/20"
                style={{
                  backgroundColor: "var(--surface-status-bg)",
                  borderColor: "var(--surface-border-white)",
                }}
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
                className="inline-flex items-center gap-2 rounded-full bg-zinc-100 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:-translate-y-0.5 hover:bg-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white"
              >
                {savingProfile ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-950/20 border-t-zinc-950" />
                    Saving&hellip;
                  </>
                ) : profileSaved ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-500" />
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

      <section id="appearance" className="scroll-mt-8">
        <ShellCard className="p-6">
          <div className="mb-5">
            <h2 className="text-strong text-xl font-semibold tracking-tight">
              Appearance
            </h2>
            <p className="text-muted mt-1 text-sm leading-relaxed">
              Switch between light and dark mode. Your preference syncs across
              devices.
            </p>
          </div>
          <ThemeToggle />
        </ShellCard>
      </section>

      <section id="safari-history-import" className="scroll-mt-8">
        <ShellCard className="p-6">
          <div className="mb-5">
            <h2 className="text-strong text-xl font-semibold tracking-tight">
              Safari History Import
            </h2>
            <p className="text-muted mt-1 text-sm leading-relaxed">
              Strengthen your profile with Safari history. Safari ZIP only —
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

      <section id="linked-accounts" className="scroll-mt-8">
        <ShellCard className="p-6">
          <div className="mb-5">
            <h2 className="text-strong text-xl font-semibold tracking-tight">
              Linked Accounts
            </h2>
            <p className="text-muted mt-1 text-sm leading-relaxed">
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
              description="Not yet supported — coming soon"
            />
            <ComingSoonCard
              Icon={Building2}
              label="Microsoft"
              description="Not yet supported — coming soon"
            />
          </div>
        </ShellCard>
      </section>

      <section id="brief-delivery-time" className="scroll-mt-8">
        <ShellCard className="p-6">
          <div className="mb-5">
            <h2 className="text-strong text-xl font-semibold tracking-tight">
              Brief Delivery Time
            </h2>
            <p className="text-muted mt-1 text-sm leading-relaxed">
              Set the local hour when your daily briefing will be ready. Your
              brief is generated shortly before this time.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label htmlFor="brief-hour" className="text-muted text-sm">
              Brief ready at:
            </label>
            <select
              id="brief-hour"
              value={briefHour}
              onChange={(e) => handleBriefHourChange(parseInt(e.target.value, 10))}
              className="rounded-[1.15rem] border px-4 py-3 text-sm text-strong shadow-sm outline-none transition focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/20"
              style={{
                backgroundColor: "var(--surface-status-bg)",
                borderColor: "var(--surface-border-white)",
              }}
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
            <span className="text-muted text-xs">local time</span>
          </div>
        </ShellCard>
      </section>

      <section id="topic-preferences" className="scroll-mt-8">
        <ShellCard className="p-6">
          <div className="mb-5">
            <h2 className="text-strong text-xl font-semibold tracking-tight">
              Topic Preferences
            </h2>
            <p className="text-muted mt-1 text-sm leading-relaxed">
              These topics influence which articles appear in your briefing. We
              auto-detect interests from your linked accounts. You can also
              adjust weights manually.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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
              className="text-muted mt-3 text-sm underline decoration-zinc-400 underline-offset-4 transition hover:text-strong"
            >
              Show all {TOPIC_TAXONOMY.length} topics
            </button>
          )}
        </ShellCard>
      </section>

      <section id="privacy" className="scroll-mt-8">
        <ShellCard className="p-6">
          <div className="mb-5">
            <h2 className="text-strong text-xl font-semibold tracking-tight">
              Privacy
            </h2>
          </div>
          <div className="space-y-3 text-sm text-muted">
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
                className="inline-flex items-center gap-1 rounded-full border border-[var(--surface-border-white)] bg-[var(--surface-card-bg)] px-4 py-2 text-sm font-medium text-strong transition hover:-translate-y-0.5 hover:bg-white/80"
              >
                Privacy Policy
                <ChevronRight className="h-4 w-4" />
              </Link>
              <Link
                href="/terms"
                className="inline-flex items-center gap-1 rounded-full border border-[var(--surface-border-white)] bg-[var(--surface-card-bg)] px-4 py-2 text-sm font-medium text-strong transition hover:-translate-y-0.5 hover:bg-white/80"
              >
                Terms of Service
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </ShellCard>
      </section>

      <section id="danger-zone" className="scroll-mt-8">
        <ShellCard
          className="border border-red-500/20 bg-[rgba(239,68,68,0.06)] p-6 shadow-[var(--shadow-soft)]"
        >
          <div className="mb-5">
            <h2 className="text-xl font-semibold tracking-tight text-red-600 dark:text-red-300">
              Danger Zone
            </h2>
            <p className="text-muted mt-1 text-sm leading-relaxed">
              Permanently delete your account and all associated data. This
              includes your profile, linked accounts, topic preferences, daily
              briefs, interest signals, and feedback events. This action cannot
              be undone.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleSignOut}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--surface-border-white)] bg-[var(--surface-card-bg)] px-4 py-2 text-sm font-medium text-strong transition hover:-translate-y-0.5 hover:bg-white/80"
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

function SettingsSidebar({
  activeAccountCount,
  briefHourLabel,
  profileReady,
  safariStatusLabel,
  topicCount,
  topicHighlights,
}: {
  activeAccountCount: number;
  briefHourLabel: string;
  profileReady: boolean;
  safariStatusLabel: string;
  topicCount: number;
  topicHighlights: string[];
}) {
  return (
    <div className="hidden lg:block">
      <div className="sticky top-0 flex max-h-[calc(100vh-2rem)] flex-col gap-4 overflow-hidden rounded-[var(--radius-hero)] border border-[var(--glass-panel-border)] bg-[var(--glass-panel-bg)] p-5 shadow-[var(--shadow-hero)] backdrop-blur-[var(--glass-panel-blur)]">
        <div className="inline-flex items-center gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-950 text-white shadow-[0_16px_30px_-18px_rgba(15,23,42,0.9)] dark:bg-zinc-100 dark:text-zinc-950">
            <Newspaper className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-strong text-lg font-semibold tracking-tight">
              AI News Digest
            </h2>
            <p className="text-muted text-sm">Settings hub</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <StatBlock
            label="Accounts"
            value={activeAccountCount}
            detail="linked sources"
          />
          <StatBlock label="Topics" value={topicCount} detail="active now" />
        </div>

        <nav className="space-y-2">
          {sidebarLinks.map((link) => {
            const active = link.href === "/settings";
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`group flex items-center rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                  active
                    ? "bg-zinc-100 text-zinc-950 shadow-[0_18px_36px_-24px_rgba(15,23,42,0.9)] dark:bg-zinc-100 dark:text-zinc-950"
                    : "text-zinc-950 hover:-translate-y-0.5 hover:bg-white/90 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                }`}
                style={{
                  borderColor: active
                    ? "rgba(15,23,42,0.05)"
                    : "var(--surface-border-white)",
                  backgroundColor: active ? undefined : "var(--surface-card-bg)",
                }}
              >
                {link.label}
                <ChevronRight
                  className={`ml-auto h-4 w-4 transition ${
                    active
                      ? "opacity-80"
                      : "opacity-35 group-hover:opacity-60"
                  }`}
                />
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
              <dt className="text-muted">Profile</dt>
              <dd className="text-strong font-medium">
                {profileReady ? "Ready" : "Unset"}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted">Brief time</dt>
              <dd className="text-strong font-medium">{briefHourLabel}</dd>
            </div>
          </dl>
          <div className="mt-4 flex flex-wrap gap-2">
            <span
              className="rounded-full border px-3 py-1 text-[11px] font-medium text-muted"
              style={{
                background: "rgba(56, 189, 248, 0.08)",
                borderColor: "rgba(56, 189, 248, 0.16)",
              }}
            >
              {safariStatusLabel}
            </span>
            <span
              className="rounded-full border px-3 py-1 text-[11px] font-medium text-muted"
              style={{
                background: "rgba(56, 189, 248, 0.08)",
                borderColor: "rgba(56, 189, 248, 0.16)",
              }}
            >
              {topicCount} topics
            </span>
            {topicHighlights.slice(0, 2).map((topic) => (
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
        </section>

        <div className="mt-auto border-t pt-4" style={{ borderColor: "var(--surface-border-subtle)" }}>
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
  Icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
}) {
  return (
    <div
      className="flex items-center justify-between rounded-[var(--radius-card)] border border-dashed p-5 opacity-85 shadow-sm"
      style={{
        borderColor: "var(--surface-border-subtle)",
        backgroundColor: "var(--surface-card-bg)",
      }}
    >
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-zinc-100 p-2 text-zinc-950 shadow-sm dark:bg-zinc-100 dark:text-zinc-950">
          <Icon className="h-5 w-5 text-sky-600" />
        </div>
        <div>
          <p className="text-strong text-sm font-medium">{label}</p>
          <p className="text-muted text-xs">{description}</p>
        </div>
      </div>
      <span className="text-muted text-xs italic">Coming soon</span>
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
      className="group flex cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-sm shadow-sm transition hover:-translate-y-0.5"
      style={{
        backgroundColor: checked
          ? "rgba(56, 189, 248, 0.12)"
          : "var(--surface-card-bg)",
        borderColor: checked
          ? "rgba(56, 189, 248, 0.28)"
          : "var(--surface-border-white)",
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(topic, e.target.checked)}
        className="rounded border-zinc-300 accent-sky-600"
      />
      <span className="text-strong group-hover:text-strong">{formatted}</span>
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
          className="rounded-full bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-400"
        >
          Delete Account
        </button>
      ) : (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-red-700 dark:text-red-300">
            Are you sure? Click below to permanently delete your account.
          </p>
          {error && <p className="text-sm text-red-700 dark:text-red-300">{error}</p>}
          <div className="flex gap-3">
            <button
              onClick={handleDelete}
              disabled={isPending}
              className="rounded-full bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-400 disabled:opacity-50"
            >
              {isPending ? "Deleting..." : "Yes, Delete Account"}
            </button>
            <button
              onClick={() => {
                setConfirmed(false);
                setError(null);
              }}
              disabled={isPending}
              className="rounded-full border border-[var(--surface-border-white)] bg-[var(--surface-card-bg)] px-4 py-2 text-sm font-medium text-strong transition-colors hover:bg-white/80 disabled:opacity-50"
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
        <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
          <span className="font-medium">History imported successfully</span>
        </div>
        <p className="text-muted text-xs">
          Safari history signals are influencing your daily brief.
        </p>
        {summary ? (
          <div
            className="rounded-[1.25rem] border p-4 shadow-sm"
            style={{
              backgroundColor: "var(--surface-status-bg)",
              borderColor: "var(--surface-border-white)",
            }}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="max-w-2xl">
                <p className="text-panel-label text-[11px] font-semibold uppercase tracking-[0.26em]">
                  Safari profile summary
                </p>
                <p className="text-strong mt-2 text-sm leading-6">
                  {summary.behaviorBlurb}
                </p>
              </div>
              <div
                className="rounded-full border px-3 py-1 text-xs font-medium text-strong"
                style={{
                  backgroundColor: "var(--surface-card-bg)",
                  borderColor: "var(--surface-border-white)",
                }}
              >
                {summary.acceptedCount.toLocaleString()} accepted visits
              </div>
            </div>

            {summary.topTopics.length > 0 ? (
              <div className="mt-4">
                <h3 className="text-subtle mb-2 text-xs font-semibold uppercase tracking-[0.22em]">
                  Top interests
                </h3>
                <div className="flex flex-wrap gap-2">
                  {summary.topTopics.map((item) => (
                    <span
                      key={item.topic}
                      className="rounded-full border px-2.5 py-1 text-xs text-strong shadow-sm"
                      style={{
                        backgroundColor: "var(--surface-card-bg)",
                        borderColor: "var(--surface-border-white)",
                      }}
                    >
                      {humanizeSafariTopic(item.topic)} ({item.count})
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {summary.topDomains.length > 0 ? (
              <div className="mt-4">
                <h3 className="text-subtle mb-2 text-xs font-semibold uppercase tracking-[0.22em]">
                  Top domains
                </h3>
                <div className="flex flex-wrap gap-2">
                  {summary.topDomains.map((item) => (
                    <span
                      key={item.domain}
                      className="rounded-full border px-2.5 py-1 text-xs text-strong shadow-sm"
                      style={{
                        backgroundColor: "var(--surface-card-bg)",
                        borderColor: "var(--surface-border-white)",
                      }}
                    >
                      {item.domain}
                      <span className="text-muted"> ({item.count})</span>
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
        <div className="flex flex-wrap gap-3 pt-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="rounded-full bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-950 transition-colors hover:bg-white"
          >
            Replace Import
          </button>
          <button
            onClick={onDelete}
            className="inline-flex items-center gap-1 rounded-full border border-red-500/20 bg-[rgba(239,68,68,0.08)] px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-[rgba(239,68,68,0.12)] dark:text-red-300"
          >
            <Trash2 className="h-4 w-4" />
            Delete History Signals
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
          <div
            className="rounded-[1.25rem] border px-3 py-3 text-center shadow-sm"
            style={{
              backgroundColor: "var(--surface-card-bg)",
              borderColor: "var(--surface-border-white)",
            }}
          >
            <div className="text-strong text-lg font-semibold">
              {preview.totalVisits.toLocaleString()}
            </div>
            <div className="text-muted text-xs">Total Visits</div>
          </div>
          <div
            className="rounded-[1.25rem] border px-3 py-3 text-center shadow-sm"
            style={{
              backgroundColor: "var(--surface-card-bg)",
              borderColor: "var(--surface-border-white)",
            }}
          >
            <div className="text-strong text-lg font-semibold">
              {preview.acceptedCount.toLocaleString()}
            </div>
            <div className="text-muted text-xs">Accepted</div>
          </div>
          <div
            className="rounded-[1.25rem] border px-3 py-3 text-center shadow-sm"
            style={{
              backgroundColor: "var(--surface-card-bg)",
              borderColor: "var(--surface-border-white)",
            }}
          >
            <div className="text-strong text-lg font-semibold">
              {preview.rejectedCount.toLocaleString()}
            </div>
            <div className="text-muted text-xs">Rejected</div>
          </div>
        </div>

        <div>
          <h3 className="text-muted mb-2 text-sm font-medium">Top Domains</h3>
          <div className="flex flex-wrap gap-2">
            {preview.topDomains.slice(0, 10).map((d) => (
              <span
                key={d.domain}
                className="rounded-full border px-2 py-1 text-xs text-strong shadow-sm"
                style={{
                  backgroundColor: "var(--surface-card-bg)",
                  borderColor: "var(--surface-border-white)",
                }}
              >
                {d.domain}{" "}
                <span className="text-muted">({d.count})</span>
              </span>
            ))}
          </div>
        </div>

        {topTopics.length > 0 && (
          <div>
            <h3 className="text-muted mb-2 text-sm font-medium">
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
                    className="rounded-full border border-sky-500/20 bg-sky-500/10 px-2 py-1 text-xs text-sky-700 dark:text-sky-200"
                  >
                    {display}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        <p className="text-muted text-xs">
          Date range: {new Date(preview.dateRange.start).toLocaleDateString()} →{" "}
          {new Date(preview.dateRange.end).toLocaleDateString()}
        </p>

        {error && <p className="text-sm text-red-700 dark:text-red-300">{error}</p>}

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            onClick={onConfirm}
            className="rounded-full bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-950 transition-colors hover:bg-white"
          >
            Confirm Import
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="rounded-full border border-[var(--surface-border-white)] bg-[var(--surface-card-bg)] px-4 py-2 text-sm font-medium text-strong transition-colors hover:bg-white/80"
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
        <div className="flex items-center gap-3 text-sm text-muted">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-300 border-t-sky-500" />
          <span>Uploading...</span>
        </div>
      )}
      {processing && (
        <div className="flex items-center gap-3 text-sm text-muted">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-300 border-t-sky-500" />
          <span>Processing your Safari history...</span>
        </div>
      )}
      {error && <p className="text-sm text-red-700 dark:text-red-300">{error}</p>}

      {!uploading && !processing && (
        <button
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-2 rounded-full bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-950 transition-colors hover:bg-white"
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
