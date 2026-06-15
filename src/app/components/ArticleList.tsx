'use client';

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { EmptyState } from './AppShell';

const PAGE_SIZE = 25;

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

type SourceRow = {
  id: string;
  name: string;
  baseUrl: string;
};

function relativeTime(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.round(diff / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function mergeRows(current: ArticleRow[], next: ArticleRow[]) {
  const seen = new Set(current.map((r) => r.id));
  return [...current, ...next.filter((r) => !seen.has(r.id))];
}

export function ArticleList() {
  const [rows, setRows] = useState<ArticleRow[]>([]);
  const [sources, setSources] = useState<SourceRow[]>([]);
  const [source, setSource] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const sourceByUrl = useMemo(() => new Map(sources.map((s) => [s.baseUrl, s.name || s.baseUrl])), [sources]);

  const fetchPage = useCallback(
    async (offset: number) => {
      const qs = new URLSearchParams();
      qs.set('limit', String(PAGE_SIZE));
      qs.set('offset', String(offset));
      if (source) qs.set('source', source);

      const res = await fetch(`/api/articles?${qs.toString()}`, { cache: 'no-store' });
      return (await res.json()) as ArticleRow[];
    },
    [source],
  );

  const loadInitial = useCallback(async () => {
    setLoading(true);
    const data = await fetchPage(0);
    setRows(data);
    setHasMore(data.length === PAGE_SIZE);
    setLoading(false);
  }, [fetchPage]);

  async function loadMore() {
    setLoadingMore(true);
    const data = await fetchPage(rows.length);
    setRows((current) => mergeRows(current, data));
    setHasMore(data.length === PAGE_SIZE);
    setLoadingMore(false);
  }

  async function refresh() {
    await loadInitial();
  }
  useEffect(() => {
    const t = setTimeout(() => {
      fetch('/api/sources', { cache: 'no-store' })
        .then((res) => res.json())
        .then((data: SourceRow[]) => setSources(data))
        .catch(console.error);
    }, 0);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      loadInitial().catch(console.error);
    }, 0);
    return () => clearTimeout(t);
  }, [loadInitial]);

  async function sendFeedback(articleId: string, value: -1 | 1) {
    setBusyId(articleId);
    await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ articleId, value }),
    });

    fetch('/api/prefs', { method: 'POST' }).catch(() => {});
    startTransition(() => {
      loadInitial().finally(() => setBusyId(null));
    });
  }

  function selectSource(next: string) {
    if (next === source) return;
    setRows([]);
    setHasMore(true);
    setSource(next);
  }

  return (
    <section className="mt-6 rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-950">Recent intake</h2>
          <p className="text-xs text-slate-500">Interleaved by publish time, with source filters and quick feedback.</p>
        </div>
        <button
          className="h-9 rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          disabled={loading || loadingMore}
          onClick={() => void refresh()}
        >
          Refresh
        </button>
      </div>

      <div className="border-b border-slate-100 px-4 py-3">
        <div className="flex flex-wrap gap-2">
          <button
            className={[
              'h-8 rounded-md border px-3 text-xs font-semibold',
              source === '' ? 'border-cyan-600 bg-cyan-700 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
            ].join(' ')}
            onClick={() => selectSource('')}
          >
            All
          </button>
          {sources.map((s) => (
            <button
              key={s.id}
              className={[
                'h-8 max-w-56 truncate rounded-md border px-3 text-xs font-semibold',
                source === s.baseUrl ? 'border-cyan-600 bg-cyan-700 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
              ].join(' ')}
              title={s.baseUrl}
              onClick={() => selectSource(s.baseUrl)}
            >
              {s.name || s.baseUrl}
            </button>
          ))}
        </div>
      </div>

      <div>
        {loading ? (
          <div className="p-6 text-sm text-slate-500">Loading articles...</div>
        ) : rows.length === 0 ? (
          <div className="p-4">
            <EmptyState>No articles yet. Run the dispatcher and worker from job settings.</EmptyState>
          </div>
        ) : (
          <>
            <div className="divide-y divide-slate-100">
              {rows.map((a) => (
                <article key={a.id} className="px-4 py-4">
                  <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="rounded bg-slate-100 px-2 py-1 font-semibold text-slate-700">
                      {sourceByUrl.get(a.baseUrl) ?? a.sourceName ?? a.baseUrl}
                    </span>
                    <span>{relativeTime(a.publishedAt ?? a.scrapedAt)}</span>
                    <span className="truncate">{a.baseUrl}</span>
                  </div>
                  <a className="text-base font-semibold leading-6 text-slate-950 hover:text-emerald-700" href={a.url} target="_blank" rel="noreferrer">
                    {a.title}
                  </a>
                  {a.summary ? <p className="mt-2 line-clamp-2 max-w-4xl text-sm leading-6 text-slate-600">{a.summary}</p> : null}

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

            <div className="border-t border-slate-100 p-4">
              {hasMore ? (
                <button
                  className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  disabled={loadingMore}
                  onClick={() => void loadMore()}
                >
                  {loadingMore ? 'Loading...' : 'Load more'}
                </button>
              ) : (
                <div className="text-center text-xs font-medium text-slate-500">End of loaded intake.</div>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
