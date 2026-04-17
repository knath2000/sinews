"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  CalendarDays,
  ChevronRight,
  Newspaper,
  Sparkles,
} from "lucide-react";
import { FLAG_KEYS, type FlagKey } from "@/lib/flags";
import { PageShell } from "@/components/page-shell";

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
    } catch (e) {
      console.error("[AI-NEWS ERROR] admin-metrics-load:", e);
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
    setFlags((prev) => ({ ...prev, [flag]: !current }));
    flagsUpdating.current.add(flag);

    try {
      await fetchJson("/api/admin/flags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flagKey: flag, enabled: !current }),
      });
    } catch {
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

  const updatedAtLabel = metrics
    ? new Date(metrics.lastUpdated).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      })
    : "Loading";

  const successRate = metrics?.briefStats.success_rate ?? 0;
  const successWidth = Math.max(18, Math.min(successRate, 100));

  const sidebarLinks = [
    { href: "#metrics", label: "Metrics" },
    { href: "#ingestion", label: "Ingestion" },
    { href: "#connectors", label: "Connectors" },
    { href: "#topics", label: "Top topics" },
    { href: "#blocked-sources", label: "Blocked sources" },
    { href: "#actions", label: "Actions" },
    { href: "#flags", label: "Flags" },
  ];

  const sidebarMarkup = (
    <div className="relative flex max-h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-[var(--radius-hero)] border border-[var(--glass-panel-border)] bg-[var(--glass-panel-bg)] p-5 shadow-[var(--shadow-hero)] backdrop-blur-[var(--glass-panel-blur)] lg:overflow-y-auto">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(56,189,248,0.10),_transparent_40%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(163,230,53,0.06),_transparent_36%)]" />

      <div className="relative flex flex-col">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/feed"
            className="inline-flex items-center gap-2 text-sm font-semibold tracking-tight text-zinc-900 transition-transform hover:scale-[1.01]"
          >
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-zinc-900 text-white shadow-lg shadow-zinc-900/15">
              <Newspaper className="h-5 w-5" />
            </span>
            <span className="leading-tight">
              AI News
              <span className="block text-xs font-medium text-zinc-500">
                Admin panel
              </span>
            </span>
          </Link>
          <span className="inline-flex items-center gap-1 rounded-full border border-white/80 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-zinc-500 shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            Ops
          </span>
        </div>

        <div
          className="mt-5 rounded-[1.5rem] border bg-gradient-to-br from-sky-50/60 via-lime-50/30 to-transparent p-4 shadow-sm"
          style={{ borderColor: "rgba(56,189,248,0.15)" }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-zinc-400">
            Dashboard
          </p>
          <div className="mt-3 flex items-end justify-between gap-4">
            <div>
              <div className="text-4xl font-semibold tracking-tight text-zinc-900">
                {metrics?.briefStats.total_generated ?? 0}
              </div>
              <p className="mt-1 text-sm text-zinc-600">briefs generated</p>
            </div>
            <div className="rounded-2xl bg-white/60 px-3 py-2 text-right shadow-sm"
              style={{ border: "1px solid rgba(255,255,255,0.75)" }}
            >
              <div className="text-[11px] uppercase tracking-[0.3em] text-zinc-400">
                Updated
              </div>
              <div className="mt-1 text-sm font-semibold text-zinc-800">
                {updatedAtLabel}
              </div>
              <div className="mt-1 text-xs text-zinc-500">local time</div>
            </div>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/80">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-500 via-violet-500 to-amber-400 transition-all duration-300"
              style={{ width: `${successWidth}%` }}
            />
          </div>
        </div>

        <div className="mt-4 rounded-[1.5rem] border bg-white/60 p-4 shadow-sm"
          style={{ borderColor: "rgba(255,255,255,0.72)" }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-zinc-400">
            Quick links
          </p>
          <div className="mt-3 space-y-2">
            {sidebarLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="group flex items-center justify-between rounded-2xl border border-transparent bg-zinc-50/60 px-3 py-2 text-sm text-zinc-600 transition-all hover:border-white/80 hover:bg-white/90 hover:text-zinc-900 hover:shadow-sm"
              >
                <span>{link.label}</span>
                <ChevronRight className="h-4 w-4 text-zinc-400 transition-transform group-hover:translate-x-0.5" />
              </a>
            ))}
          </div>
        </div>

        <div className="mt-4 rounded-[1.5rem] border border-white/10 bg-zinc-900/95 p-4 text-white shadow-[0_24px_60px_-38px_rgba(15,23,42,0.5)]">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.35em] text-white/55">
            <CalendarDays className="h-3.5 w-3.5" />
            Today
          </div>
          <p className="mt-3 text-sm leading-relaxed text-white/80">
            Track source health and trigger ingestion from the same bright
            shell as the product feed.
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <PageShell
      sidebar={sidebarMarkup}
    >
      <div className="space-y-6">
        {/* Admin hero — restrained, more ops-flavored */}
        <section className="motion-fade-up relative overflow-hidden rounded-[var(--radius-hero)] border border-[var(--glass-hero-border)] bg-[var(--glass-hero-bg)] shadow-[var(--shadow-hero)] backdrop-blur-[var(--glass-hero-blur)] px-6 py-8 sm:px-8 sm:py-10">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_70%_at_15%_5%,_rgba(56,189,248,0.10),_transparent)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_50%_at_85%_10%,_rgba(163,230,53,0.06),_transparent)]" />
          <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />

          <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.32em] text-zinc-500 shadow-sm">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                Admin dashboard
              </div>
              <h1 className="mt-5 text-4xl font-semibold tracking-tight text-zinc-900 sm:text-5xl lg:text-6xl">
                Ingestion metrics, connector health, and operational tools.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-zinc-600 sm:text-lg">
                Monitor the pipeline, inspect failures, and run recovery
                actions from the same editorial shell as the feed.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:w-[360px]">
              <div
                className="rounded-[1.75rem] border p-4 shadow-sm"
                style={{
                  background: "linear-gradient(145deg, rgba(255,255,255,0.88), rgba(255,255,255,0.60))",
                  borderColor: "rgba(56,189,248,0.14)",
                }}
              >
                <div className="text-[11px] font-semibold uppercase tracking-[0.35em] text-zinc-400">
                  Success rate
                </div>
                <div className="mt-3 text-4xl font-semibold tracking-tight text-zinc-900">
                  {metrics ? `${metrics.briefStats.success_rate}%` : "…"}
                </div>
                <div className="mt-2 text-sm text-zinc-600">
                  briefs completed
                </div>
              </div>
              <div
                className="rounded-[1.75rem] border p-4 shadow-sm"
                style={{
                  background: metrics?.briefStats.today_failed
                    ? "linear-gradient(145deg, rgba(244,63,94,0.10), rgba(244,63,94,0.05))"
                    : "linear-gradient(145deg, rgba(163,230,53,0.10), rgba(56,189,248,0.06))",
                  borderColor: metrics?.briefStats.today_failed ? "rgba(244,63,94,0.18)" : "rgba(163,230,53,0.16)",
                }}
              >
                <div className="text-[11px] font-semibold uppercase tracking-[0.35em] text-zinc-400">
                  Failed today
                </div>
                <div className="mt-3 text-4xl font-semibold tracking-tight text-zinc-900">
                  {metrics ? metrics.briefStats.today_failed : "…"}
                </div>
                <div className="mt-2 text-sm text-zinc-600">needs attention</div>
              </div>
            </div>
          </div>
        </section>

        {(actionMessage !== null || actionError !== null) && (
          <div
            className="motion-fade-up rounded-[var(--radius-card)] border px-4 py-3 text-sm shadow-sm"
            style={{
              background: actionError ? "rgba(244,63,94,0.06)" : "rgba(16,185,129,0.06)",
              borderColor: actionError ? "rgba(244,63,94,0.15)" : "rgba(16,185,129,0.15)",
              color: actionError ? "rgba(244,63,94,0.90)" : "rgba(16,185,129,0.90)",
            }}
          >
            {actionError ?? actionMessage}
          </div>
        )}

        {loading ? (
          <div className="relative overflow-hidden rounded-[var(--radius-card)] border border-[var(--glass-soft-border)] bg-[var(--glass-soft-bg)] px-6 py-16 text-center text-sm text-zinc-500 shadow-sm backdrop-blur-[var(--glass-soft-blur)]">
            Loading metrics…
          </div>
        ) : error ? (
          <div className="relative overflow-hidden rounded-[var(--radius-card)] border px-6 py-6 text-sm shadow-sm"
            style={{
              background: "rgba(244,63,94,0.06)",
              borderColor: "rgba(244,63,94,0.15)",
              color: "rgba(244,63,94,0.90)",
            }}
          >
            {error}
          </div>
        ) : metrics ? (
          <div className="space-y-6">
            {/* Metric blocks — tinted, more editorial than dashboard */}
            <section
              id="metrics"
              className="grid grid-cols-2 gap-4 sm:grid-cols-4"
            >
              {[
                { label: "Brief success rate", value: `${metrics.briefStats.success_rate}%` },
                { label: "Avg duration", value: `${metrics.briefStats.avg_duration_ms}ms` },
                { label: "Total generated", value: `${metrics.briefStats.total_generated}` },
                { label: "Today failed", value: `${metrics.briefStats.today_failed}`, warn: metrics.briefStats.today_failed > 0 },
              ].map((m) => (
                <div
                  key={m.label}
                  className="rounded-[1.5rem] border p-5 shadow-sm"
                  style={{
                    background: m.warn ? "rgba(244,63,94,0.04)" : "rgba(255,255,255,0.60)",
                    borderColor: m.warn ? "rgba(244,63,94,0.12)" : "rgba(255,255,255,0.72)",
                  }}
                >
                  <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">
                    {m.label}
                  </p>
                  <p className={`mt-2 text-3xl font-semibold tracking-tight ${m.warn ? "text-rose-600" : "text-zinc-900"}`}>
                    {m.value}
                  </p>
                </div>
              ))}
            </section>

            {/* Ingestion table — card with lighter framing */}
            <div
              id="ingestion"
              className="relative overflow-hidden rounded-[var(--radius-card)] border border-[var(--glass-panel-border)] bg-[var(--glass-panel-bg)] p-6 shadow-[var(--shadow-soft)] backdrop-blur-[var(--glass-panel-blur)]"
            >
              <div className="flex flex-col gap-3 border-b border-white/50 pb-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">
                    Ingestion
                  </p>
                  <h2 className="mt-2 text-xl font-semibold tracking-tight text-zinc-900">
                    Ingestion (last 7 days)
                  </h2>
                </div>
                <div
                  className="rounded-full px-3 py-1 text-xs font-medium"
                  style={{
                    background: "rgba(255,255,255,0.50)",
                    color: "rgba(59,130,246,0.75)",
                    border: "1px solid rgba(56,189,248,0.12)",
                  }}
                >
                  {metrics.ingestionStats.length} source rows
                </div>
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/40">
                      <th className="px-3 py-2 text-left font-medium text-zinc-500">
                        Source
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-zinc-500">
                        Provider
                      </th>
                      <th className="px-3 py-2 text-right font-medium text-zinc-500">
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
                          className="border-b border-white/30 last:border-b-0"
                        >
                          <td className="px-3 py-3 font-medium text-zinc-900">
                            {row.source}
                          </td>
                          <td className="px-3 py-3 text-zinc-500">
                            {row.provider}
                          </td>
                          <td className="px-3 py-3 text-right font-mono text-zinc-700">
                            {row.count}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
              {/* Connectors */}
              <div
                id="connectors"
                className="relative overflow-hidden rounded-[var(--radius-card)] border border-[var(--glass-panel-border)] bg-[var(--glass-panel-bg)] p-6 shadow-[var(--shadow-soft)] backdrop-blur-[var(--glass-panel-blur)]"
              >
                <div className="flex flex-col gap-3 border-b border-white/50 pb-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">
                      Connector health
                    </p>
                    <h2 className="mt-2 text-xl font-semibold tracking-tight text-zinc-900">
                      Connector failures
                    </h2>
                  </div>
                </div>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/40">
                        <th className="px-3 py-2 text-left font-medium text-zinc-500">
                          Provider
                        </th>
                        <th className="px-3 py-2 text-right font-medium text-zinc-500">
                          Errors
                        </th>
                        <th className="px-3 py-2 text-right font-medium text-zinc-500">
                          Users affected
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
                            className="border-b border-white/30 last:border-b-0"
                          >
                            <td className="px-3 py-3 font-medium text-zinc-900">
                              {row.provider}
                            </td>
                            <td className="px-3 py-3 text-right font-mono text-rose-600">
                              {row.error_count}
                            </td>
                            <td className="px-3 py-3 text-right font-mono text-zinc-700">
                              {row.users_affected}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="space-y-6">
                {/* Top topics */}
                <div id="topics"
                  className="relative overflow-hidden rounded-[var(--radius-card)] border border-[var(--glass-soft-border)] bg-[var(--glass-soft-bg)] p-5 shadow-[var(--shadow-soft)] backdrop-blur-[var(--glass-soft-blur)]"
                >
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">
                      Ranking
                    </p>
                    <h2 className="mt-2 text-xl font-semibold tracking-tight text-zinc-900">
                      Top topics
                    </h2>
                  </div>
                  {metrics.topTopics.length === 0 ? (
                    <p className="mt-4 text-sm text-zinc-400">
                      No topic data yet.
                    </p>
                  ) : (
                    <ul className="mt-4 space-y-2">
                      {metrics.topTopics.map((t) => (
                        <li
                          key={t.topic}
                          className="flex items-center justify-between rounded-2xl border bg-white/50 px-3 py-2 text-sm"
                          style={{ borderColor: "rgba(255,255,255,0.65)" }}
                        >
                          <span className="text-zinc-800">{t.topic}</span>
                          <span className="font-mono text-zinc-500">
                            {t.count}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Blocked sources */}
                <div id="blocked-sources"
                  className="relative overflow-hidden rounded-[var(--radius-card)] border border-[var(--glass-soft-border)] bg-[var(--glass-soft-bg)] p-5 shadow-[var(--shadow-soft)] backdrop-blur-[var(--glass-soft-blur)]"
                >
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">
                      Source policy
                    </p>
                    <h2 className="mt-2 text-xl font-semibold tracking-tight text-zinc-900">
                      Blocked / disabled sources
                    </h2>
                  </div>
                  {metrics.blockedSources.length === 0 ? (
                    <p className="mt-4 text-sm text-zinc-400">
                      No blocked sources.
                    </p>
                  ) : (
                    <ul className="mt-4 space-y-3">
                      {metrics.blockedSources.map((s) => (
                        <li
                          key={s.source_name}
                          className="flex items-center justify-between gap-3 rounded-2xl border bg-white/50 px-3 py-2 text-sm"
                          style={{ borderColor: "rgba(255,255,255,0.65)" }}
                        >
                          <div className="min-w-0">
                            <span className="font-medium text-zinc-900">
                              {s.source_name}
                            </span>
                            <span className="ml-2 text-xs text-zinc-400">
                              floor: {s.quality_floor}
                            </span>
                          </div>
                          <button
                            onClick={() => handleToggleSource(s.source_name, true)}
                            className="rounded-full border border-white/60 bg-white/60 px-3 py-1 text-xs font-medium text-zinc-700 transition hover:-translate-y-0.5 hover:bg-white/90 hover:shadow-sm"
                          >
                            Enable
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>

            {/* Actions — manual triggers */}
            <div id="actions" className="grid gap-6 xl:grid-cols-2">
              <div className="relative overflow-hidden rounded-[var(--radius-card)] border border-[var(--glass-panel-border)] bg-[var(--glass-panel-bg)] p-6 shadow-[var(--shadow-soft)] backdrop-blur-[var(--glass-panel-blur)]">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">
                    Operations
                  </p>
                  <h2 className="mt-2 text-xl font-semibold tracking-tight text-zinc-900">
                    Manual triggers
                  </h2>
                </div>
                <div className="mt-5 space-y-4">
                  <button
                    onClick={handleRunIngest}
                    className="inline-flex items-center justify-center rounded-full bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white shadow-[0_12px_30px_-16px_rgba(15,23,42,0.8)] transition hover:-translate-y-0.5 hover:bg-zinc-800"
                  >
                    Run ingest
                  </button>

                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-[0.3em] text-zinc-400">
                      Resync account
                    </label>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input
                        type="text"
                        placeholder="userId"
                        value={resyncUserId}
                        onChange={(e) => setResyncUserId(e.target.value)}
                        className="flex-1 rounded-2xl border border-white/70 bg-white/70 px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 shadow-sm outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-200/70"
                      />
                      <input
                        type="text"
                        placeholder="provider"
                        value={resyncProvider}
                        onChange={(e) => setResyncProvider(e.target.value)}
                        className="w-full rounded-2xl border border-white/70 bg-white/70 px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 shadow-sm outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-200/70 sm:w-32"
                      />
                      <button
                        onClick={handleAccountResync}
                        className="inline-flex items-center justify-center rounded-full border border-white/70 bg-white/70 px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:-translate-y-0.5 hover:bg-white/90 hover:shadow-sm"
                      >
                        Resync
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-[var(--radius-card)] border border-[var(--glass-panel-border)] bg-[var(--glass-panel-bg)] p-6 shadow-[var(--shadow-soft)] backdrop-blur-[var(--glass-panel-blur)]">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">
                    Policy manager
                  </p>
                  <h2 className="mt-2 text-xl font-semibold tracking-tight text-zinc-900">
                    Source policy manager
                  </h2>
                </div>
                <div className="mt-5 space-y-4">
                  <div>
                    <label className="text-xs uppercase tracking-[0.3em] text-zinc-400">
                      Source name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. x-twitter"
                      value={sourceName}
                      onChange={(e) => setSourceName(e.target.value)}
                      className="mt-2 w-full rounded-2xl border border-white/70 bg-white/70 px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 shadow-sm outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-200/70"
                    />
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-[0.3em] text-zinc-400">
                      Quality floor (1-5)
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
                      className="mt-2 w-28 rounded-2xl border border-white/70 bg-white/70 px-3 py-2.5 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-200/70"
                    />
                  </div>
                  <button
                    onClick={handleSourcePolicy}
                    className="inline-flex items-center justify-center rounded-full bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white shadow-[0_12px_30px_-16px_rgba(15,23,42,0.8)] transition hover:-translate-y-0.5 hover:bg-zinc-800"
                  >
                    Save policy
                  </button>
                </div>
              </div>
            </div>

            {/* Feature flags */}
            <div
              id="flags"
              className="relative overflow-hidden rounded-[var(--radius-card)] border border-[var(--glass-panel-border)] bg-[var(--glass-panel-bg)] p-6 shadow-[var(--shadow-soft)] backdrop-blur-[var(--glass-panel-blur)]"
            >
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">
                  Feature controls
                </p>
                <h2 className="mt-2 text-xl font-semibold tracking-tight text-zinc-900">
                  Feature flags
                </h2>
              </div>
              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {(Object.keys(FLAG_KEYS) as FlagKey[]).map((flag) => {
                  const on = flags[flag];
                  return (
                    <div
                      key={flag}
                      className="flex items-center justify-between rounded-2xl border bg-white/50 px-4 py-3 shadow-sm"
                      style={{ borderColor: "rgba(255,255,255,0.65)" }}
                    >
                      <span className="mr-2 truncate font-mono text-sm text-zinc-800">
                        {flag}
                      </span>
                      <button
                        onClick={() => handleToggleFlag(flag)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          on ? "bg-zinc-900" : "bg-zinc-300"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            on ? "translate-x-6" : "translate-x-1"
                        }`}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </PageShell>
  );
}
