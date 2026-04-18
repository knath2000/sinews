"use client";

import { useState, useEffect, useMemo } from "react";

type ArticleData = {
  id: number;
  title: string;
  source_name: string;
  provider: string;
  published_at: string | null;
  created_at: string;
  canonical_url: string;
  language: string;
};

type SortKey = keyof ArticleData;
type SortOrder = "asc" | "desc";

export function ArticlesTable() {
  const [articles, setArticles] = useState<ArticleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("source_name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);

  useEffect(() => {
    loadArticles();
  }, []);

  const loadArticles = async () => {
    try {
      const res = await fetch("/api/admin/articles");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.articles) setArticles(data.articles);
      setLoading(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load articles");
      setLoading(false);
    }
  };

  const handleDelete = async (id: number, title: string) => {
    if (!confirm(`Delete "${title}"?\n\nThis will also remove its annotation and clear any brief item references.`)) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/articles?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setArticles((prev) => prev.filter((a) => a.id !== id));
        setDeleteMessage("Article deleted");
      } else {
        const body = await res.json().catch(() => ({}));
        setDeleteMessage(`Failed: ${body.error || "unknown error"}`);
      }
    } catch {
      setDeleteMessage("Failed to delete article");
    } finally {
      setDeletingId(null);
      setTimeout(() => setDeleteMessage(null), 3000);
    }
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
  };

  const sortedArticles = useMemo(() => {
    return [...articles].sort((a, b) => {
      const aVal = a[sortKey] ?? "";
      const bVal = b[sortKey] ?? "";
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortOrder === "asc" ? cmp : -cmp;
    });
  }, [articles, sortKey, sortOrder]);

  if (loading) {
    return (
      <section className="rounded-[12px] border p-6" style={{ borderColor: "var(--ds-border)", backgroundColor: "var(--ds-surface-1)" }}>
        <p className="text-center text-sm" style={{ color: "var(--ds-text-muted)" }}>Loading articles…</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-[12px] border p-6" style={{ borderColor: "rgba(239,68,68,0.25)", backgroundColor: "var(--ds-surface-1)" }}>
        <p className="text-center text-sm" style={{ color: "#ef4444" }}>{error}</p>
        <button className="ds-btn-secondary mx-auto mt-3 block" onClick={loadArticles}>Retry</button>
      </section>
    );
  }

  const SortArrow = ({ col }: { col: SortKey }) =>
    sortKey === col ? (sortOrder === "asc" ? " ↑" : " ↓") : "";

  const sourceNames = Array.from(new Set(articles.map((a) => a.source_name)));
  const providers = Array.from(new Set(articles.map((a) => a.provider)));

  return (
    <section
      className="rounded-[12px] border"
      style={{ borderColor: "var(--ds-border)", backgroundColor: "var(--ds-surface-1)" }}
    >
      {/* Header */}
      <div
        className="flex flex-col gap-3 border-b px-6 py-4 md:flex-row md:items-end md:justify-between"
        style={{ borderColor: "var(--ds-border)" }}
      >
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--ds-text-dim)" }}>
            All articles
          </p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight" style={{ color: "var(--ds-text)" }}>
            Article database ({articles.length} recent)
          </h2>
          <p className="mt-0.5 text-xs" style={{ color: "var(--ds-text-dim)" }}>
            {sourceNames.length} sources · {providers.length} providers
          </p>
        </div>
        <div className="flex items-center gap-2">
          {deleteMessage && (
            <span className="text-xs" style={{ color: deleteMessage.startsWith("Failed") ? "#ef4444" : "var(--ds-text-muted)" }}>
              {deleteMessage}
            </span>
          )}
          <button className="ds-btn-secondary text-xs" onClick={loadArticles}>Refresh</button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: "var(--ds-surface-2)" }}>
              <th
                className="cursor-pointer px-6 py-3 text-left text-[10px] font-semibold uppercase tracking-widest"
                style={{ color: "var(--ds-text-dim)" }}
                onClick={() => handleSort("title")}
              >
                Title <SortArrow col="title" />
              </th>
              <th
                className="cursor-pointer px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest"
                style={{ color: "var(--ds-text-dim)" }}
                onClick={() => handleSort("source_name")}
              >
                Source <SortArrow col="source_name" />
              </th>
              <th
                className="cursor-pointer px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest"
                style={{ color: "var(--ds-text-dim)" }}
                onClick={() => handleSort("provider")}
              >
                Provider <SortArrow col="provider" />
              </th>
              <th
                className="cursor-pointer px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest"
                style={{ color: "var(--ds-text-dim)" }}
                onClick={() => handleSort("published_at")}
              >
                Published <SortArrow col="published_at" />
              </th>
              <th
                className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest"
                style={{ color: "var(--ds-text-dim)" }}
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedArticles.length === 0 ? (
              <tr>
                <td className="px-6 py-12 text-center text-sm" style={{ color: "var(--ds-text-dim)" }}>
                  No articles found.
                </td>
              </tr>
            ) : (
              sortedArticles.map((article) => (
                <tr
                  key={article.id}
                  className="border-t hover:bg-[var(--ds-surface-2)]"
                  style={{ borderColor: "var(--ds-border)" }}
                >
                  <td className="max-w-[320px] px-6 py-3">
                    <a
                      href={article.canonical_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate text-sm font-medium underline-offset-2 hover:underline"
                      style={{ color: "var(--ds-text)" }}
                      title={article.title}
                    >
                      {article.title}
                    </a>
                    {article.language && (
                      <span className="ml-2 text-[10px] font-medium uppercase rounded-full border px-1.5 py-0.5" style={{ borderColor: "var(--ds-border)", color: "var(--ds-text-dim)" }}>
                        {article.language}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: "var(--ds-text-muted)" }}>
                    {article.source_name}
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: "var(--ds-text-muted)" }}>
                    {article.provider}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs" style={{ color: "var(--ds-text-dim)" }}>
                    {article.published_at
                      ? new Date(article.published_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDelete(article.id, article.title)}
                      disabled={deletingId === article.id}
                      className="rounded-[10px] border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
                      style={{
                        borderColor: "rgba(239,68,68,0.25)",
                        color: "#ef4444",
                        backgroundColor: deletingId === article.id ? "rgba(239,68,68,0.1)" : "transparent",
                      }}
                    >
                      {deletingId === article.id ? "Deleting…" : "Delete"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
