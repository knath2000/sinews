import Link from "next/link";
import { X as XIcon, Wifi } from "lucide-react";
import { TOPIC_TAXONOMY } from "@/server/taxonomy";

interface LinkedAccountInfo {
  provider: string;
  status: string;
  connected_at: string | null;
  expires_at: string | null;
}

// TODO: this should fetch from the database server-side
async function getLinkedAccounts(): Promise<LinkedAccountInfo[]> {
  // Placeholder — connect to db.linked_accounts
  return [];
}

// TODO: fetch user topic preferences
async function getUserTopics() {
  return [];
}

export default async function SettingsPage(
  props: { searchParams?: Promise<{ connected?: string; error?: string }> }
) {
  const searchParams = await props.searchParams;
  const connected = searchParams?.connected;
  const error = searchParams?.error;

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
        {connected && (
          <div className="mb-6 p-4 rounded-xl bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-900 text-sm text-green-800 dark:text-green-200">
            Connected to {connected === "x" ? "X / Twitter" : "Google"}{" "}
            successfully! Your signals will now influence your daily briefing.
          </div>
        )}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 text-sm text-red-800 dark:text-red-200">
            Connection failed: {decodeURIComponent(error)}
          </div>
        )}

        {/* Linked Accounts */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Linked Accounts</h2>
          <div className="space-y-3">
            <ProviderCard provider="x" label="X / Twitter" />
            <ProviderCard provider="google" label="Google" />
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
                <TopicBadge key={topic} topic={topic} />
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
      </main>
    </div>
  );
}

function ProviderCard({
  provider,
  label,
}: {
  provider: string;
  label: string;
}) {
  // TODO: fetch actual account status from DB
  const isConnected = false; // placeholder

  const IconComponent = provider === "x" ? XIcon : Wifi;

  return (
    <div className="flex items-center justify-between rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
      <div className="flex items-center gap-3">
        <div
          className={`p-2 rounded-full ${
            isConnected
              ? "bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400"
              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"
          }`}
        >
          <IconComponent className="w-5 h-5" />
        </div>
        <div>
          <p className="font-medium text-sm">{label}</p>
          <p className="text-xs text-zinc-400">
            {isConnected ? "Connected" : "Not connected"}
          </p>
        </div>
      </div>
      {/* TODO: wire up real connect/disconnect actions */}
      {isConnected ? (
        <button
          onClick={() =>
            fetch(`/api/accounts/${provider}`, { method: "DELETE" }).then(
              () => window.location.reload()
            )
          }
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
    <form
      action={async () => {
        "use server";
        // Server-side redirect after starting OAuth
        // For now, use a client POST
      }}
    >
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
    </form>
  );
}

function TopicBadge({ topic }: { topic: string }) {
  const formatted = topic
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <label className="flex items-center gap-2 text-sm cursor-pointer group">
      <input
        type="checkbox"
        defaultChecked
        className="rounded border-zinc-300 dark:border-zinc-600 accent-blue-600"
      />
      <span className="group-hover:underline">{formatted}</span>
    </label>
  );
}
