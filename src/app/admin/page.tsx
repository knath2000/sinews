import Link from "next/link";
import { db } from "@/server/db/client";

export const dynamic = "force-dynamic";

async function getJobRuns() {
  return db.job_runs.findMany({
    orderBy: { started_at: "desc" },
    take: 20,
  });
}

async function getLinkedAccounts() {
  return db.linked_accounts.findMany({
    select: {
      id: true,
      provider: true,
      status: true,
      last_sync_at: true,
      sync_error_code: true,
      access_token_encrypted: true,
      refresh_token_encrypted: true,
      token_invalidated_at: true,
    },
    orderBy: { last_sync_at: "desc" },
  });
}

// Revalidate every 30 seconds
export const revalidate = 30;

export default async function AdminPage() {
  const [jobs, accounts] = await Promise.all([getJobRuns(), getLinkedAccounts()]);

  const activeCount = accounts.filter(
    (a) => a.status === "active"
  ).length;

  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-10 bg-zinc-50/80 dark:bg-zinc-950/80 backdrop-blur">
        <nav className="max-w-5xl mx-auto flex items-center justify-between px-6 py-3">
          <Link href="/" className="text-sm font-semibold hover:underline">
            AI News Brief
          </Link>
          <Link
            href="/feed"
            className="text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 text-sm"
          >
            Feed
          </Link>
        </nav>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-8">
        <h1 className="text-2xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8">
          Internal debug view — ingestion status, linked account signals, manual triggers.
        </p>

        {/* Quick stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <StatCard label="Linked Accounts (Active)" value={activeCount.toString()} />
          <StatCard label="Total Accounts" value={accounts.length.toString()} />
          <StatCard label="Recent Jobs" value={jobs.length.toString()} />
        </div>

        {/* Manual triggers */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Manual Triggers</h2>
          <div className="flex gap-3">
            <button
              disabled
              className="px-4 py-2 text-sm rounded-full border border-zinc-300 dark:border-zinc-700 text-zinc-500 cursor-not-allowed"
            >
              Trigger Ingest (placeholder)
            </button>
            <button
              disabled
              className="px-4 py-2 text-sm rounded-full border border-zinc-300 dark:border-zinc-700 text-zinc-500 cursor-not-allowed"
            >
              Trigger Brief Backfill (placeholder)
            </button>
          </div>
          <p className="text-xs text-zinc-400 mt-2">
            These buttons will be wired up to Inngest triggers once auth is
            configured.
          </p>
        </section>

        {/* Linked accounts */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Linked Account Signals</h2>
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
                  <th className="text-left px-4 py-3 font-medium">ID</th>
                  <th className="text-left px-4 py-3 font-medium">Provider</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium">
                    Last Sync
                  </th>
                  <th className="text-left px-4 py-3 font-medium">
                    Has Access Token
                  </th>
                  <th className="text-left px-4 py-3 font-medium">
                    Has Refresh Token
                  </th>
                  <th className="text-left px-4 py-3 font-medium">
                    Error Code
                  </th>
                </tr>
              </thead>
              <tbody>
                {accounts.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-8 text-center text-zinc-400"
                    >
                      No linked accounts yet.
                    </td>
                  </tr>
                ) : (
                  accounts.map((acc) => (
                    <tr
                      key={acc.id}
                      className="border-b border-zinc-100 dark:border-zinc-850"
                    >
                      <td className="px-4 py-3 font-mono text-xs">
                        {acc.id}
                      </td>
                      <td className="px-4 py-3">{acc.provider}</td>
                      <td className="px-4 py-3">
                        <StatusDot status={acc.status} />
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-400">
                        {acc.last_sync_at
                          ? acc.last_sync_at.toLocaleString()
                          : "never"}
                      </td>
                      <td className="px-4 py-3">
                        {acc.access_token_encrypted ? "yes" : "no"}
                      </td>
                      <td className="px-4 py-3">
                        {acc.refresh_token_encrypted ? "yes" : "no"}
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-400">
                        {acc.sync_error_code ?? "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Recent job runs */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Recent Job Runs</h2>
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
                  <th className="text-left px-4 py-3 font-medium">Job</th>
                  <th className="text-left px-4 py-3 font-medium">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 font-medium">
                    Started
                  </th>
                  <th className="text-left px-4 py-3 font-medium">
                    Finished
                  </th>
                  <th className="text-left px-4 py-3 font-medium">Error</th>
                </tr>
              </thead>
              <tbody>
                {jobs.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-zinc-400"
                    >
                      No job runs recorded yet.
                    </td>
                  </tr>
                ) : (
                  jobs.map((job) => (
                    <tr
                      key={job.id}
                      className="border-b border-zinc-100 dark:border-zinc-850"
                    >
                      <td className="px-4 py-3 font-mono text-xs">
                        {job.job_name}
                      </td>
                      <td className="px-4 py-3">
                        <StatusDot status={job.status} />
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-400">
                        {job.started_at.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-400">
                        {job.finished_at
                          ? job.finished_at.toLocaleString()
                          : "running"}
                      </td>
                      <td className="px-4 py-3 text-xs text-red-500 max-w-xs truncate">
                        {job.error_text ?? "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
      <p className="text-xs text-zinc-400 uppercase tracking-wide">{label}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
    </div>
  );
}

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
    <span className="inline-flex items-center gap-1.5 text-xs">
      <span className={`w-2 h-2 rounded-full ${color}`} />
      {status}
    </span>
  );
}
