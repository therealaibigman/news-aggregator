'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { EmptyState } from './AppShell';

type ArticleRow = {
  id: string;
  url: string;
  title: string;
  summary: string | null;
  publishedAt: string | null;
  scrapedAt: string;
  sourceId: string;
  sourceName: string;
  baseUrl: string;
  likes: number;
  dislikes: number;
};

function relativeTime(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.round(diff / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function ArticleList() {
  const [rows, setRows] = useState<ArticleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function load() {
    setLoading(true);
    const res = await fetch('/api/articles?limit=100&order=oldest', { cache: 'no-store' });
    const data = (await res.json()) as ArticleRow[];
    setRows(data);
    setLoading(false);
  }

  useEffect(() => {
    const t = setTimeout(() => {
      load().catch(console.error);
    }, 0);
    return () => clearTimeout(t);
  }, []);

  const bySource = useMemo(() => {
    const m = new Map<string, ArticleRow[]>();
    for (const r of rows) {
      const k = r.sourceName || r.baseUrl;
      m.set(k, [...(m.get(k) ?? []), r]);
    }
    return Array.from(m.entries()).slice(0, 6);
  }, [rows]);

  async function sendFeedback(articleId: string, value: -1 | 1) {
    setBusyId(articleId);
    await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ articleId, value }),
    });

    fetch('/api/prefs', { method: 'POST' }).catch(() => {});
    startTransition(() => {
      load().finally(() => setBusyId(null));
    });
  }

  return (
    <section className="mt-6 rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-950">Recent intake</h2>
          <p className="text-xs text-slate-500">Grouped by source, with quick feedback for preference tuning.</p>
        </div>
        <button
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          disabled={loading}
          onClick={() => void load()}
        >
          Refresh
        </button>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="text-sm text-slate-500">Loading articles...</div>
        ) : bySource.length === 0 ? (
          <EmptyState>No articles yet. Run the dispatcher and worker from job settings.</EmptyState>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {bySource.map(([source, items]) => (
              <section key={source} className="rounded-lg border border-slate-200">
                <div className="border-b border-slate-100 px-3 py-2">
                  <div className="truncate text-sm font-semibold text-slate-900">{source}</div>
                  <div className="text-xs text-slate-500">{items.length} latest articles</div>
                </div>
                <div className="divide-y divide-slate-100">
                  {items.slice(0, 5).map((a) => (
                    <article key={a.id} className="px-3 py-3">
                      <div className="mb-1 flex items-center justify-between gap-3 text-xs text-slate-500">
                        <span className="truncate">{a.baseUrl}</span>
                        <span className="shrink-0">{relativeTime(a.publishedAt ?? a.scrapedAt)}</span>
                      </div>
                      <a className="text-sm font-medium leading-5 text-slate-950 hover:text-emerald-700" href={a.url} target="_blank" rel="noreferrer">
                        {a.title}
                      </a>
                      {a.summary ? <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-600">{a.summary}</p> : null}

                      <div className="mt-3 flex items-center gap-2 text-xs">
                        <button
                          className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                          disabled={busyId === a.id}
                          onClick={() => sendFeedback(a.id, 1)}
                        >
                          Like {a.likes}
                        </button>
                        <button
                          className="rounded-md border border-red-200 bg-red-50 px-2 py-1 font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                          disabled={busyId === a.id}
                          onClick={() => sendFeedback(a.id, -1)}
                        >
                          Dislike {a.dislikes}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
