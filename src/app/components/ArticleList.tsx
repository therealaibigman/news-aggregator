'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';

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

export function ArticleList() {
  const [rows, setRows] = useState<ArticleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function load() {
    setLoading(true);
    const res = await fetch('/api/articles?limit=100', { cache: 'no-store' });
    const data = (await res.json()) as ArticleRow[];
    setRows(data);
    setLoading(false);
  }

  useEffect(() => {
    // Defer to satisfy react-hooks/set-state-in-effect lint.
    const t = setTimeout(() => {
      load().catch(console.error);
    }, 0);
    return () => clearTimeout(t);
  }, []);

  const bySource = useMemo(() => {
    const m = new Map<string, ArticleRow[]>();
    for (const r of rows) {
      const k = r.baseUrl;
      m.set(k, [...(m.get(k) ?? []), r]);
    }
    return Array.from(m.entries());
  }, [rows]);

  async function sendFeedback(articleId: string, value: -1 | 1) {
    setBusyId(articleId);
    await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ articleId, value }),
    });
    // refresh counts
    startTransition(() => {
      load().finally(() => setBusyId(null));
    });
  }

  if (loading) return <div className="mt-6 text-sm text-gray-700">Loading articles…</div>;

  return (
    <div className="mt-8 space-y-8">
      {bySource.length === 0 ? (
        <div className="text-sm text-gray-700">No articles yet. Run the refresh job.</div>
      ) : (
        bySource.map(([baseUrl, items]) => (
          <section key={baseUrl} className="space-y-3">
            <div className="text-sm font-semibold text-gray-800">{baseUrl}</div>
            <div className="space-y-2">
              {items.map((a) => (
                <div key={a.id} className="rounded border bg-white p-3">
                  <div className="text-xs text-gray-500">{a.sourceName}</div>
                  <a className="font-medium underline" href={a.url} target="_blank" rel="noreferrer">
                    {a.title}
                  </a>
                  {a.summary ? <div className="mt-1 text-sm text-gray-700">{a.summary}</div> : null}

                  <div className="mt-3 flex items-center gap-2 text-xs">
                    <button
                      className="rounded border px-2 py-1 hover:bg-gray-50 disabled:opacity-50"
                      disabled={busyId === a.id}
                      onClick={() => sendFeedback(a.id, 1)}
                    >
                      Like ({a.likes})
                    </button>
                    <button
                      className="rounded border px-2 py-1 hover:bg-gray-50 disabled:opacity-50"
                      disabled={busyId === a.id}
                      onClick={() => sendFeedback(a.id, -1)}
                    >
                      Dislike ({a.dislikes})
                    </button>
                    <span className="ml-auto text-gray-500">scraped {new Date(a.scrapedAt).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
