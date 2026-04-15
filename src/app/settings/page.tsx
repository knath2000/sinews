"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { X as XIcon, Wifi } from "lucide-react";
import { TOPIC_TAXONOMY } from "@/server/taxonomy";

interface LinkedAccountInfo {
  provider: string;
  status: string;
  expires_at: string | null;
  last_sync_at: string | null;
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

  // Resolve search params once on client
  useEffect(() => {
    if (searchParams) {
      searchParams.then((sp) => {
        if (sp?.connected) setConnectedParam(sp.connected);
        if (sp?.error) setErrorParam(sp.error);
      });
    }
  }, [searchParams]);

  // Load accounts + topics on mount
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
  }, []);

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

        {/* Linked Accounts */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Linked Accounts</h2>
          <div className="space-y-3">
            <ProviderCard
              provider="x"
              label="X / Twitter"
              connected={isConnected("x")}
              onDisconnected={() =>
                setLinkedAccounts((prev) =>
                  prev.map((a) =>
                    a.provider === "x" ? { ...a, status: "disconnected" } : a
                  )
                )
              }
            />
            <ProviderCard
              provider="google"
              label="Google"
              connected={isConnected("google")}
              onDisconnected={() =>
                setLinkedAccounts((prev) =>
                  prev.map((a) =>
                    a.provider === "google" ? { ...a, status: "disconnected" } : a
                  )
                )
              }
            />
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
              {TOPIC_TAXONOMY.map((topic) => (
                <TopicBadge
                  key={topic}
                  topic={topic}
                  checked={topics.has(topic)}
                  disabled={savingTopic === topic}
                  onChange={toggleTopic}
                />
              ))}
            </div>
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
  onDisconnected,
}: {
  provider: string;
  label: string;
  connected: boolean;
  onDisconnected: () => void;
}) {
  const IconComponent = provider === "x" ? XIcon : Wifi;

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
          <p className="text-xs text-zinc-400">
            {connected ? "Connected" : "Not connected"}
          </p>
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
