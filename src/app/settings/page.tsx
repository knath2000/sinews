"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { X as XIcon, Wifi, CircleUser, Building2, Globe, Trash2 } from "lucide-react";
import { TOPIC_TAXONOMY } from "@/server/taxonomy";
import { createClient } from "@/lib/supabase/client";

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
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccountInfo[]>([]);
  const [topics, setTopics] = useState<Set<string>>(new Set());
  const [savingTopic, setSavingTopic] = useState<string | null>(null);
  const [briefHour, setBriefHour] = useState(4);
  const [showAllTopics, setShowAllTopics] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Safari History Import state ---
  const [safariImport, setSafariImport] = useState<{
    id: string;
    status: string;
    preview_json: string | null;
    confirmed_at: string | null;
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

    // Load Safari import status
    fetch("/api/history-imports")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.import) {
          const imp = data.import;
          setSafariImport(imp);
          if (imp.status === "preview_ready" && imp.preview_json) {
            try { setSafariPreview(JSON.parse(imp.preview_json)); } catch { /* ignore */ }
          }
        }
      })
      .catch(() => {});
  }, []);

  // Helper: derive account status with display info
  function getAccountStatus(account: LinkedAccountInfo | undefined) {
    if (!account) return { label: "Disconnected", color: "gray" as const };
    if (account.status === "active") return { label: "Connected", color: "green" as const };
    if (account.status === "error" || account.sync_error_code) return { label: "Sync Error", color: "yellow" as const };
    return { label: "Disconnected", color: "gray" as const };
  }

  function formatLastSync(at: string | null) {
    if (!at) return null;
    try {
      const d = new Date(at);
      return d.toLocaleString("en-US", {
        month: "short", day: "numeric",
        hour: "numeric", minute: "2-digit",
      });
    } catch {
      return at;
    }
  }

  // Helper: is a provider connected?
  const isConnected = (provider: string) => {
    return linkedAccounts.some((a) => a.provider === provider && a.status === "active");
  };

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
      setSafariImport((prev) => (prev ? { ...prev, status: "confirmed", confirmed_at: new Date().toISOString() } : null));
      setSafariPreview(null);
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
      setSafariImport(null);
      setSafariPreview(null);
    } catch (err: unknown) {
      setSafariError(err instanceof Error ? err.message : "Unknown error");
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Nav */}
      <header className="border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-10 bg-zinc-50/80 dark:bg-zinc-950/80 backdrop-blur">
        <nav className="max-w-3xl mx-auto flex items-center justify-between px-6 py-3">
          <Link href="/" className="text-sm font-semibold hover:underline">
            AI News Brief
          </Link>
          <div className="flex gap-4 text-sm">
            <Link
              href="/feed"
              className="text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              Feed
            </Link>
          </div>
        </nav>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-8">
        <h1 className="text-2xl font-bold mb-2">Settings</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8">
          Manage your linked accounts, topic preferences, and privacy settings.
        </p>

        {/* Flash messages */}
        {connectedParam && (
          <div className="mb-6 p-4 rounded-xl bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-900 text-sm text-green-800 dark:text-green-200">
            Connected to {connectedParam === "x" ? "X / Twitter" : "Google"}{" "}
            successfully! Your signals will now influence your daily briefing.
          </div>
        )}
        {errorParam && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 text-sm text-red-800 dark:text-red-200">
            Connection failed: {decodeURIComponent(errorParam)}
          </div>
        )}

        {/* Safari History Import */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Safari History Import</h2>
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
              Strengthen your profile with Safari history. Safari ZIP only — passwords, cards, bookmarks ignored. Raw file deleted after processing.
            </p>
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
          </div>
        </section>

        {/* Linked Accounts */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Linked Accounts</h2>
          <div className="space-y-3">
            <ProviderCard
              provider="x"
              label="X / Twitter"
              connected={isConnected("x")}
              account={linkedAccounts.find((a) => a.provider === "x")}
              onDisconnected={() =>
                setLinkedAccounts((prev) =>
                  prev.map((a) =>
                    a.provider === "x" ? { ...a, status: "disconnected" } : a
                  )
                )
              }
              getStatus={getAccountStatus}
              formatLastSync={formatLastSync}
            />
            <ProviderCard
              provider="google"
              label="Google"
              connected={isConnected("google")}
              account={linkedAccounts.find((a) => a.provider === "google")}
              onDisconnected={() =>
                setLinkedAccounts((prev) =>
                  prev.map((a) =>
                    a.provider === "google" ? { ...a, status: "disconnected" } : a
                  )
                )
              }
              getStatus={getAccountStatus}
              formatLastSync={formatLastSync}
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
        </section>

        {/* Brief Ready Hour */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Brief Delivery Time</h2>
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
              Set the local hour when your daily briefing will be ready. Your brief is generated shortly before this time.
            </p>
            <div className="flex items-center gap-3">
              <label htmlFor="brief-hour" className="text-sm text-zinc-600 dark:text-zinc-400">
                Brief ready at:
              </label>
              <select
                id="brief-hour"
                value={briefHour}
                onChange={(e) => handleBriefHourChange(parseInt(e.target.value, 10))}
                className="rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Array.from({ length: 24 }, (_, h) => {
                  const display12 = h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`;
                  return (
                    <option key={h} value={h}>
                      {h}:00 {display12}
                    </option>
                  );
                })}
              </select>
              <span className="text-xs text-zinc-400">local time</span>
            </div>
          </div>
        </section>

        {/* Topic Preferences */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Topic Preferences</h2>
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-5">
              These topics influence which articles appear in your briefing. We
              auto-detect interests from your linked accounts. You can also
              adjust weights manually.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {TOPIC_TAXONOMY.map((topic) => {
                const display = topic.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
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
                className="mt-3 text-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 underline"
              >
                Show all {TOPIC_TAXONOMY.length} topics
              </button>
            )}
          </div>
        </section>

        {/* Privacy */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Privacy</h2>
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
            <div className="space-y-3 text-sm text-zinc-600 dark:text-zinc-400">
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
              <div className="flex gap-4 pt-2">
                <Link href="/privacy" className="text-blue-600 dark:text-blue-400 hover:underline text-sm">
                  Privacy Policy →
                </Link>
                <Link href="/terms" className="text-blue-600 dark:text-blue-400 hover:underline text-sm">
                  Terms of Service →
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Delete Account */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-4 text-red-600 dark:text-red-400">
            Danger Zone
          </h2>
          <div className="rounded-2xl border border-red-200 dark:border-red-900 bg-white dark:bg-zinc-900 p-6">
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
              Permanently delete your account and all associated data. This
              includes your profile, linked accounts, topic preferences, daily
              briefs, interest signals, and feedback events. This action cannot
              be undone.
            </p>
            <DeleteAccountButton />
          </div>
        </section>
      </main>
    </div>
  );
}

function ProviderCard({
  provider,
  label,
  connected,
  account,
  onDisconnected,
  getStatus,
  formatLastSync,
}: {
  provider: string;
  label: string;
  connected: boolean;
  account?: LinkedAccountInfo;
  onDisconnected: () => void;
  getStatus: (acc: LinkedAccountInfo | undefined) => { label: string; color: "green" | "yellow" | "gray" };
  formatLastSync: (at: string | null) => string | null;
}) {
  const IconComponent = provider === "x" ? XIcon : Wifi;
  const { label: statusLabel, color } = getStatus(account);
  const lastSyncStr = formatLastSync(account?.last_sync_at ?? null);

  const badgeColors: Record<string, { bg: string; text: string; dot: string }> = {
    green: {
      bg: "bg-green-100 dark:bg-green-900",
      text: "text-green-700 dark:text-green-400",
      dot: "bg-green-500",
    },
    yellow: {
      bg: "bg-yellow-100 dark:bg-yellow-900",
      text: "text-yellow-700 dark:text-yellow-400",
      dot: "bg-yellow-500",
    },
    gray: {
      bg: "bg-zinc-100 dark:bg-zinc-800",
      text: "text-zinc-600 dark:text-zinc-400",
      dot: "bg-zinc-400",
    },
  };

  const badge = badgeColors[color];

  return (
    <div className="flex items-center justify-between rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
      <div className="flex items-center gap-3">
        <div
          className={`p-2 rounded-full ${
            connected
              ? "bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400"
              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"
          }`}
        >
          <IconComponent className="w-5 h-5" />
        </div>
        <div>
          <p className="font-medium text-sm">{label}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${badge.bg} ${badge.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
              {statusLabel}
            </span>
            {lastSyncStr && (
              <span className="text-xs text-zinc-400">
                Last synced: {lastSyncStr}
              </span>
            )}
          </div>
        </div>
      </div>
      {connected ? (
        <button
          onClick={async () => {
            const res = await fetch(`/api/accounts/${provider}`, {
              method: "DELETE",
            });
            if (res.ok) {
              onDisconnected();
            }
          }}
          className="px-4 py-2 text-sm rounded-full border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
        >
          Disconnect
        </button>
      ) : (
        <ConnectButton provider={provider} />
      )}
    </div>
  );
}

function ConnectButton({ provider }: { provider: string }) {
  return (
    <button
      onClick={async () => {
        const res = await fetch(`/api/accounts/${provider}/start`, {
          method: "POST",
        });
        if (res.ok) {
          const data = await res.json();
          if (data.authUrl) {
            window.location.href = data.authUrl;
          }
        }
      }}
      className="px-4 py-2 text-sm rounded-full bg-zinc-900 dark:bg-white dark:text-zinc-900 text-white hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors"
    >
      Connect
    </button>
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
    <div className="flex items-center justify-between rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-5 opacity-60">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-300 dark:text-zinc-600">
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="font-medium text-sm text-zinc-500 dark:text-zinc-500">{label}</p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">{description}</p>
        </div>
      </div>
      <span className="text-xs text-zinc-400 dark:text-zinc-600 italic">Coming soon</span>
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
    <label className="flex items-center gap-2 text-sm cursor-pointer group">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(topic, e.target.checked)}
        className="rounded border-zinc-300 dark:border-zinc-600 accent-blue-600"
      />
      <span className="group-hover:underline">{formatted}</span>
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
    } catch (err) {
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
          className="px-4 py-2 text-sm rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors"
        >
          Delete Account
        </button>
      ) : (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-red-600 dark:text-red-400">
            Are you sure? Click below to permanently delete your account.
          </p>
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
          <div className="flex gap-3">
            <button
              onClick={handleDelete}
              disabled={isPending}
              className="px-4 py-2 text-sm rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {isPending ? "Deleting..." : "Yes, Delete Account"}
            </button>
            <button
              onClick={() => {
                setConfirmed(false);
                setError(null);
              }}
              disabled={isPending}
              className="px-4 py-2 text-sm rounded-full border border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Safari Import UI Component ──────────────────────────────────────────────

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

  // Confirmed — showing management controls
  if (safariImport?.status === "confirmed") {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="font-medium">History imported successfully</span>
        </div>
        <p className="text-xs text-zinc-400 dark:text-zinc-500">
          Safari history signals are influencing your daily brief.
        </p>
        <div className="flex gap-3 pt-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 text-sm rounded-full bg-zinc-900 dark:bg-white dark:text-zinc-900 text-white hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors"
          >
            Replace Import
          </button>
          <button
            onClick={onDelete}
            className="px-4 py-2 text-sm rounded-full border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 transition-colors flex items-center gap-1"
          >
            <Trash2 className="w-4 h-4" /> Delete History Signals
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

  // Preview ready — show aggregated summary
  if (safariImport?.status === "preview_ready" && safariPreview) {
    const preview = safariPreview;
    const topTopics = Object.entries(preview.topicCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([topic, count]) => ({ topic, count }));

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-center">
            <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{preview.totalVisits.toLocaleString()}</div>
            <div className="text-xs text-zinc-400">Total Visits</div>
          </div>
          <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-center">
            <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{preview.acceptedCount.toLocaleString()}</div>
            <div className="text-xs text-zinc-400">Accepted</div>
          </div>
          <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-center">
            <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{preview.rejectedCount.toLocaleString()}</div>
            <div className="text-xs text-zinc-400">Rejected</div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-2">Top Domains</h3>
          <div className="flex flex-wrap gap-2">
            {preview.topDomains.slice(0, 10).map((d) => (
              <span key={d.domain} className="text-xs px-2 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                {d.domain} <span className="text-zinc-400">({d.count})</span>
              </span>
            ))}
          </div>
        </div>

        {topTopics.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-2">Inferred Topics</h3>
            <div className="flex flex-wrap gap-2">
              {topTopics.map((t) => {
                const display = t.topic.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
                return (
                  <span key={t.topic} className="text-xs px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
                    {display}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        <p className="text-xs text-zinc-400 dark:text-zinc-500">
          Date range: {new Date(preview.dateRange.start).toLocaleDateString()} → {new Date(preview.dateRange.end).toLocaleDateString()}
        </p>

        {error && (<p className="text-sm text-red-600 dark:text-red-400">{error}</p>)}

        <div className="flex gap-3 pt-2">
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            Confirm Import
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 text-sm rounded-full border border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
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

  // No import yet — upload button
  return (
    <div className="space-y-4">
      {uploading && (
        <div className="flex items-center gap-3 text-sm text-zinc-500">
          <div className="w-5 h-5 border-2 border-zinc-300 dark:border-zinc-600 border-t-blue-500 rounded-full animate-spin" />
          <span>Uploading...</span>
        </div>
      )}
      {processing && (
        <div className="flex items-center gap-3 text-sm text-zinc-500">
          <div className="w-5 h-5 border-2 border-zinc-300 dark:border-zinc-600 border-t-blue-500 rounded-full animate-spin" />
          <span>Processing your Safari history...</span>
        </div>
      )}
      {error && (<p className="text-sm text-red-600 dark:text-red-400">{error}</p>)}

      {!uploading && !processing && (
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-4 py-2 text-sm rounded-full bg-zinc-900 dark:bg-white dark:text-zinc-900 text-white hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors flex items-center gap-2"
        >
          <Globe className="w-4 h-4" /> Upload Safari Export ZIP
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
