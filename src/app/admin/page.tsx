"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { FLAG_KEYS, type FlagKey } from "@/lib/flags";

// -- Types -------------------------------------------------------------------

interface IngestionStat { source: string; provider: string; count: number }
interface BriefStats {
  success_rate: number;
  avg_duration_ms: number;
  total_generated: number;
  today_failed: number;
}
interface ConnectorFailure {
  provider: string;
  error_count: number;
  users_affected: number;
}
interface TopicStat { topic: string; count: number }
interface BlockedSource {
  source_name: string;
  enabled: boolean;
  quality_floor: number;
}
interface MetricsData {
  ingestionStats: IngestionStat[];
  briefStats: BriefStats;
  connectorFailures: ConnectorFailure[];
  topTopics: TopicStat[];
  blockedSources: BlockedSource[];
  lastUpdated: string;
}

// -- Helpers -----------------------------------------------------------------

function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  return fetch(url, init).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}: ${r.statusText}`);
    return r.json() as T;
  });
}

// -- Components --------------------------------------------------------------

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: "bg-green-500",
    success: "bg-green-500",
    completed: "bg-green-500",
    pending: "bg-yellow-500",
    running: "bg-blue-500",
    failed: "bg-red-500",
    error: "bg-red-500",
    disconnected: "bg-gray-400",
  };
  const color = colors[status] ?? "bg-gray-400";

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs`}>
      <span className={`w-2 h-2 rounded-full ${color}`} />
      {status}
    </span>
  );
}

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 ${className}`}
    >
      {children}
    </div>
  );
}

// -- Main Page ---------------------------------------------------------------

export default function AdminPage() {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Source policy form
  const [sourceName, setSourceName] = useState("");
  const [qualityFloor, setQualityFloor] = useState(2);

  // Account resync form
  const [resyncUserId, setResyncUserId] = useState("");
  const [resyncProvider, setResyncProvider] = useState("");

  // Feature flags
  const [flags, setFlags] = useState<Record<FlagKey, boolean>>(
    () =>
      Object.fromEntries(
        Object.entries(FLAG_KEYS).map(([key, val]) => [key, val]),
      ) as Record<FlagKey, boolean>,
  );
  const flagsUpdating = useRef(new Set<string>());

  // Poll ref for cleanup
  const pollRef = useRef<number | null>(null);

  const loadMetrics = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchJson<MetricsData>("/api/admin/metrics");
      setMetrics(data);
      setLoading(false);
      // Update flags from DB response (only for flags not currently being toggled)
      // Flags have their own initial fetch below, so metrics don't own flag state
    } catch (e) {
      console.error("Failed to load metrics:", e);
      setError(e instanceof Error ? e.message : "Failed to load metrics");
      setLoading(false);
    }
  }, []);

  const loadFlags = useCallback(async () => {
    try {
      const rows = await fetchJson<{
        flags: { flag_key: string; enabled: boolean }[];
      }>("/api/admin/flags");
      const updated = { ...flags };
      for (const row of rows.flags) {
        if (
          row.flag_key in FLAG_KEYS &&
          !flagsUpdating.current.has(row.flag_key)
        ) {
          updated[row.flag_key as FlagKey] = row.enabled;
        }
      }
      setFlags(updated);
    } catch {
      // flags will use defaults from FLAG_KEYS
    }
  }, [flags]);

  useEffect(() => {
    loadMetrics();
    loadFlags();
    pollRef.current = window.setInterval(loadMetrics, 30_000);
    return () => {
      if (pollRef.current !== null) clearInterval(pollRef.current);
    };
  }, [loadMetrics, loadFlags]);

  const flashMessage = (msg: string) => {
    setActionMessage(msg);
    setActionError(null);
    setTimeout(() => setActionMessage(null), 3000);
  };

  const flashError = (msg: string) => {
    setActionError(msg);
    setActionMessage(null);
    setTimeout(() => setActionError(null), 5000);
  };

  // -- handlers -----------------------------------------------------------

  const handleRunIngest = async () => {
    try {
      await fetchJson<{ status: string }>("/api/admin/ingest/run", {
        method: "POST",
      });
      flashMessage("Ingestion queued");
    } catch (e) {
      flashError(
        "Failed to trigger ingestion: " +
          (e instanceof Error ? e.message : "unknown"),
      );
    }
  };

  const handleAccountResync = async () => {
    if (!resyncUserId.trim() || !resyncProvider.trim()) {
      flashError("Both userId and provider are required");
      return;
    }
    try {
      await fetchJson("/api/admin/account-resync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: resyncUserId, provider: resyncProvider }),
      });
      flashMessage("Account resync queued");
      setResyncUserId("");
      setResyncProvider("");
    } catch (e) {
      flashError(
        "Failed to enqueue resync: " +
          (e instanceof Error ? e.message : "unknown"),
      );
    }
  };

  const handleSourcePolicy = async () => {
    if (!sourceName.trim()) {
      flashError("Source name is required");
      return;
    }
    try {
      await fetchJson("/api/admin/source-policy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceName, qualityFloor }),
      });
      flashMessage(`Policy updated for "${sourceName}"`);
      setSourceName("");
      loadMetrics();
    } catch (e) {
      flashError(
        "Failed to update source policy: " +
          (e instanceof Error ? e.message : "unknown"),
      );
    }
  };

  const handleToggleFlag = async (flag: FlagKey) => {
    const current = flags[flag];
    // Optimistic update
    setFlags((prev) => ({ ...prev, [flag]: !current }));
    flagsUpdating.current.add(flag);

    try {
      await fetchJson("/api/admin/flags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flagKey: flag, enabled: !current }),
      });
    } catch {
      // Rollback
      setFlags((prev) => ({ ...prev, [flag]: current }));
      flashError(`Failed to toggle ${flag}`);
    } finally {
      flagsUpdating.current.delete(flag);
    }
  };

  const handleToggleSource = async (source: string, nextEnabled: boolean) => {
    try {
      await fetchJson("/api/admin/source-policy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceName: source, enabled: nextEnabled }),
      });
      loadMetrics();
    } catch (e) {
      flashError(
        "Failed to update source: " +
          (e instanceof Error ? e.message : "unknown"),
      );
    }
  };

  // -- render -------------------------------------------------------------

  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-10 bg-zinc-50/80 dark:bg-zinc-950/80 backdrop-blur">
        <nav className="max-w-6xl mx-auto flex items-center justify-between px-6 py-3">
          <a href="/" className="text-sm font-semibold hover:underline">
            AI News Brief
          </a>
          <a
            href="/feed"
            className="text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 text-sm"
          >
            Feed
          </a>
        </nav>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Admin Dashboard</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Ingestion metrics, connector health, and operational tools
            {metrics && (
              <span className="ml-2 text-xs">
                Last updated: {new Date(metrics.lastUpdated).toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>

        {(actionMessage !== null || actionError !== null) && (
          <div
            className={`rounded-xl px-4 py-3 text-sm ${
              actionError
                ? "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-800"
                : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
            }`}
          >
            {actionError ?? actionMessage}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16 text-zinc-400 text-sm">
            Loading metrics…
          </div>
        ) : error ? (
          <div className="text-red-500 text-sm">{error}</div>
        ) : metrics ? (
          <>
            {/* -- Brief Stats Cards ----------------------------------- */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Card>
                <p className="text-xs text-zinc-400 uppercase tracking-wide">
                  Brief Success Rate
                </p>
                <p className="text-3xl font-bold mt-1">
                  {metrics.briefStats.success_rate}%
                </p>
              </Card>
              <Card>
                <p className="text-xs text-zinc-400 uppercase tracking-wide">
                  Avg Duration
                </p>
                <p className="text-3xl font-bold mt-1">
                  {metrics.briefStats.avg_duration_ms}
                  <span className="text-sm font-normal text-zinc-400 ml-1">
                    ms
                  </span>
                </p>
              </Card>
              <Card>
                <p className="text-xs text-zinc-400 uppercase tracking-wide">
                  Total Generated
                </p>
                <p className="text-3xl font-bold mt-1">
                  {metrics.briefStats.total_generated}
                </p>
              </Card>
              <Card>
                <p className="text-xs text-zinc-400 uppercase tracking-wide">
                  Today Failed
                </p>
                <p
                  className={`text-3xl font-bold mt-1 ${
                    metrics.briefStats.today_failed > 0
                      ? "text-red-500"
                      : "text-zinc-900 dark:text-zinc-100"
                  }`}
                >
                  {metrics.briefStats.today_failed}
                </p>
              </Card>
            </div>

            {/* -- Ingestion Table ------------------------------------ */}
            <Card>
              <h2 className="text-sm font-semibold mb-3">
                Ingestion (last 7 days)
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800">
                      <th className="text-left px-3 py-2 font-medium">
                        Source
                      </th>
                      <th className="text-left px-3 py-2 font-medium">
                        Provider
                      </th>
                      <th className="text-right px-3 py-2 font-medium">
                        Articles
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.ingestionStats.length === 0 ? (
                      <tr>
                        <td
                          colSpan={3}
                          className="px-3 py-8 text-center text-zinc-400"
                        >
                          No articles in the last 7 days.
                        </td>
                      </tr>
                    ) : (
                      metrics.ingestionStats.map((row, i) => (
                        <tr
                          key={`${row.source}-${row.provider}-${i}`}
                          className="border-b border-zinc-100 dark:border-zinc-850"
                        >
                          <td className="px-3 py-2">{row.source}</td>
                          <td className="px-3 py-2 text-zinc-500">
                            {row.provider}
                          </td>
                          <td className="px-3 py-2 text-right font-mono">
                            {row.count}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* -- Connector Failures --------------------------------- */}
            <Card>
              <h2 className="text-sm font-semibold mb-3">
                Connector Failures
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800">
                      <th className="text-left px-3 py-2 font-medium">
                        Provider
                      </th>
                      <th className="text-right px-3 py-2 font-medium">
                        Errors
                      </th>
                      <th className="text-right px-3 py-2 font-medium">
                        Users Affected
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.connectorFailures.length === 0 ? (
                      <tr>
                        <td
                          colSpan={3}
                          className="px-3 py-8 text-center text-zinc-400"
                        >
                          All connectors healthy
                        </td>
                      </tr>
                    ) : (
                      metrics.connectorFailures.map((row, i) => (
                        <tr
                          key={`${row.provider}-${i}`}
                          className="border-b border-zinc-100 dark:border-zinc-850"
                        >
                          <td className="px-3 py-2">{row.provider}</td>
                          <td className="px-3 py-2 text-right font-mono text-red-500">
                            {row.error_count}
                          </td>
                          <td className="px-3 py-2 text-right font-mono">
                            {row.users_affected}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* -- Two-column: Top Topics + Blocked Sources ----------- */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <h2 className="text-sm font-semibold mb-3">Top Topics</h2>
                {metrics.topTopics.length === 0 ? (
                  <p className="text-sm text-zinc-400">No topic data yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {metrics.topTopics.map((t) => (
                      <li
                        key={t.topic}
                        className="flex justify-between text-sm"
                      >
                        <span>{t.topic}</span>
                        <span className="font-mono text-zinc-500">
                          {t.count}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              <Card>
                <h2 className="text-sm font-semibold mb-3">
                  Blocked / Disabled Sources
                </h2>
                {metrics.blockedSources.length === 0 ? (
                  <p className="text-sm text-zinc-400">No blocked sources.</p>
                ) : (
                  <ul className="space-y-3">
                    {metrics.blockedSources.map((s) => (
                      <li
                        key={s.source_name}
                        className="flex items-center justify-between text-sm"
                      >
                        <div>
                          <span className="font-medium">{s.source_name}</span>
                          <span className="ml-2 text-xs text-zinc-400">
                            floor: {s.quality_floor}
                          </span>
                        </div>
                        <button
                          onClick={() =>
                            handleToggleSource(s.source_name, true)
                          }
                          className="px-2 py-1 text-xs rounded-full border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        >
                          Enable
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>

            {/* -- Actions Row: Manual Triggers + Source Policy -------- */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <h2 className="text-sm font-semibold mb-4">Manual Triggers</h2>
                <div className="space-y-4">
                  {/* Run Ingest */}
                  <button
                    onClick={handleRunIngest}
                    className="px-4 py-2 text-sm rounded-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90"
                  >
                    Run Ingest
                  </button>

                  {/* Account Resync */}
                  <div className="space-y-2">
                    <label className="text-xs text-zinc-500 uppercase tracking-wide">
                      Resync Account
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="userId"
                        value={resyncUserId}
                        onChange={(e) => setResyncUserId(e.target.value)}
                        className="flex-1 px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 placeholder:text-zinc-400"
                      />
                      <input
                        type="text"
                        placeholder="provider"
                        value={resyncProvider}
                        onChange={(e) => setResyncProvider(e.target.value)}
                        className="w-24 px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 placeholder:text-zinc-400"
                      />
                      <button
                        onClick={handleAccountResync}
                        className="px-4 py-2 text-sm rounded-full border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      >
                        Resync
                      </button>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Source Policy Manager */}
              <Card>
                <h2 className="text-sm font-semibold mb-4">
                  Source Policy Manager
                </h2>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-zinc-500 uppercase tracking-wide">
                      Source Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. x-twitter"
                      value={sourceName}
                      onChange={(e) => setSourceName(e.target.value)}
                      className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 placeholder:text-zinc-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 uppercase tracking-wide">
                      Quality Floor (1–5)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={qualityFloor}
                      onChange={(e) =>
                        setQualityFloor(
                          Math.min(5, Math.max(1, parseInt(e.target.value) || 1)),
                        )
                      }
                      className="mt-1 w-24 px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
                    />
                  </div>
                  <button
                    onClick={handleSourcePolicy}
                    className="px-4 py-2 text-sm rounded-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90"
                  >
                    Save Policy
                  </button>
                </div>
              </Card>
            </div>

            {/* -- Feature Flag Grid ---------------------------------- */}
            <Card>
              <h2 className="text-sm font-semibold mb-4">Feature Flags</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {(Object.keys(FLAG_KEYS) as FlagKey[]).map((flag) => {
                  const on = flags[flag];
                  return (
                    <div
                      key={flag}
                      className="flex items-center justify-between px-4 py-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950"
                    >
                      <span className="text-sm font-mono truncate mr-2">
                        {flag}
                      </span>
                      <button
                        onClick={() => handleToggleFlag(flag)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          on ? "bg-zinc-900 dark:bg-zinc-100" : "bg-zinc-300 dark:bg-zinc-700"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-zinc-900 transition-transform ${
                            on ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
            </Card>
          </>
        ) : null}
      </main>
    </div>
  );
}
