'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { EmptyState, StatTile } from '@/app/components/AppShell';

type Row = {
  id: string;
  url: string;
  title: string;
  summary: string | null;
  scrapedAt: string;
  interestScore: number | null;
  interestReason: string | null;
  interestLabels: string | null;
  sourceName: string;
  baseUrl: string;
  readAt: string | null;
  hidden: boolean | null;
  saved: boolean | null;
  likes: number;
  dislikes: number;
};

type Filters = {
  unread: boolean;
  savedOnly: boolean;
  minScore: number;
  sort: 'new' | 'score';
  source: string;
};

function getSavedFilters(): Filters {
  try {
    const raw = localStorage.getItem('articles.filters');
    if (!raw) throw new Error('no saved');
    const v = JSON.parse(raw) as unknown;
    const o = typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : null;
    if (!o) throw new Error('bad');

    return {
      unread: typeof o.unread === 'boolean' ? o.unread : true,
      savedOnly: typeof o.savedOnly === 'boolean' ? o.savedOnly : false,
      minScore: typeof o.minScore === 'number' ? o.minScore : 0,
      sort: o.sort === 'score' ? 'score' : 'new',
      source: typeof o.source === 'string' ? o.source : '',
    };
  } catch {
    return { unread: true, savedOnly: false, minScore: 0, sort: 'new', source: '' };
  }
}

function scoreTone(score: number | null) {
  if (score === null) return 'bg-slate-100 text-slate-600';
  if (score >= 80) return 'bg-emerald-50 text-emerald-700';
  if (score >= 50) return 'bg-amber-50 text-amber-700';
  return 'bg-slate-100 text-slate-600';
}

function relativeTime(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.round(diff / 60000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

export function ArticlesClient() {
  const [rows, setRows] = useState<Row[]>([]);
  const [filters, setFilters] = useState<Filters>(getSavedFilters);
  const [openWhy, setOpenWhy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams();
    qs.set('limit', '100');
    if (filters.unread) qs.set('unread', '1');
    if (filters.savedOnly) qs.set('saved', '1');
    const res = await fetch(`/api/articles/list?${qs.toString()}`, { cache: 'no-store' });
    const data = (await res.json()) as Row[];
    setRows(data);
    setLoading(false);
  }, [filters.unread, filters.savedOnly]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  const sources = useMemo(() => Array.from(new Set(rows.map((r) => r.baseUrl))).sort(), [rows]);

  const filtered = useMemo(() => {
    const f = rows
      .filter((r) => (r.interestScore ?? 0) >= filters.minScore)
      .filter((r) => (filters.source ? r.baseUrl === filters.source : true));

    if (filters.sort === 'score') {
      f.sort((a, b) => (b.interestScore ?? -1) - (a.interestScore ?? -1));
    }
    return f;
  }, [rows, filters.minScore, filters.sort, filters.source]);

  const stats = useMemo(() => {
    const scored = rows.filter((r) => r.interestScore !== null);
    const avg = scored.length
      ? Math.round(scored.reduce((sum, r) => sum + (r.interestScore ?? 0), 0) / scored.length)
      : 0;

    return {
      total: filtered.length,
      saved: rows.filter((r) => r.saved).length,
      unread: rows.filter((r) => !r.readAt).length,
      avg,
    };
  }, [rows, filtered.length]);

  useEffect(() => {
    localStorage.setItem('articles.filters', JSON.stringify(filters));
  }, [filters]);

  async function bulk(action: 'read' | 'unread' | 'save' | 'unsave' | 'hide') {
    const ids = filtered.slice(0, 50).map((r) => r.id);
    for (const id of ids) {
      if (action === 'read') await markRead(id, true, false);
      if (action === 'unread') await markRead(id, false, false);
      if (action === 'save') await setSaved(id, true, false);
      if (action === 'unsave') await setSaved(id, false, false);
      if (action === 'hide') await setHidden(id, true, false);
    }
    await load();
  }

  async function markRead(articleId: string, read: boolean, refresh = true) {
    await fetch('/api/articles/read', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ articleId, read }),
    });
    if (refresh) await load();
  }

  async function setHidden(articleId: string, hidden: boolean, refresh = true) {
    await fetch('/api/articles/hide', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ articleId, hidden }),
    });
    if (refresh) await load();
  }

  async function setSaved(articleId: string, saved: boolean, refresh = true) {
    await fetch('/api/articles/save', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ articleId, saved }),
    });
    if (refresh) await load();
  }

  return (
    <div className="space-y-5">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="In view" value={loading ? '...' : stats.total} detail="after filters" />
        <StatTile label="Unread" value={stats.unread} detail="loaded set" />
        <StatTile label="Saved" value={stats.saved} detail="loaded set" />
        <StatTile label="Avg score" value={stats.avg || '—'} detail="scored loaded articles" />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="grid gap-3 md:grid-cols-5">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300"
                checked={filters.unread}
                onChange={(e) => setFilters({ ...filters, unread: e.target.checked })}
              />
              Unread
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300"
                checked={filters.savedOnly}
                onChange={(e) => setFilters({ ...filters, savedOnly: e.target.checked })}
              />
              Saved
            </label>
            <label className="grid gap-1 text-xs font-medium uppercase text-slate-500">
              Min score
              <input
                type="number"
                className="h-9 rounded-md border border-slate-300 px-2 text-sm font-normal text-slate-950"
                value={filters.minScore}
                onChange={(e) => setFilters({ ...filters, minScore: Number(e.target.value) })}
              />
            </label>
            <label className="grid gap-1 text-xs font-medium uppercase text-slate-500">
              Sort
              <select
                className="h-9 rounded-md border border-slate-300 px-2 text-sm font-normal text-slate-950"
                value={filters.sort}
                onChange={(e) => setFilters({ ...filters, sort: e.target.value === 'score' ? 'score' : 'new' })}
              >
                <option value="new">Newest</option>
                <option value="score">Score</option>
              </select>
            </label>
            <label className="grid gap-1 text-xs font-medium uppercase text-slate-500">
              Source
              <select
                className="h-9 rounded-md border border-slate-300 px-2 text-sm font-normal text-slate-950"
                value={filters.source}
                onChange={(e) => setFilters({ ...filters, source: e.target.value })}
              >
                <option value="">All sources</option>
                {sources.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <button className="h-9 rounded-md bg-slate-950 px-3 text-sm font-medium text-white hover:bg-slate-800" onClick={() => void load()}>
            Refresh
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 text-xs">
          <span className="font-medium text-slate-500">Bulk first 50:</span>
          {[
            ['read', 'Mark read'],
            ['unread', 'Mark unread'],
            ['save', 'Save'],
            ['unsave', 'Unsave'],
            ['hide', 'Hide'],
          ].map(([action, label]) => (
            <button
              key={action}
              className="rounded-md border border-slate-300 px-2 py-1 font-medium text-slate-700 hover:bg-slate-50"
              onClick={() => bulk(action as 'read' | 'unread' | 'save' | 'unsave' | 'hide')}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-6 text-sm text-slate-500">Loading articles...</div>
        ) : filtered.length === 0 ? (
          <div className="p-4">
            <EmptyState>No articles match the current filters.</EmptyState>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((a) => (
              <article key={a.id} className={['p-4', a.readAt ? 'bg-white' : 'bg-emerald-50/30'].join(' ')}>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                      <span className={`rounded px-2 py-1 font-semibold ${scoreTone(a.interestScore)}`}>
                        {a.interestScore ?? '—'}
                      </span>
                      <span className="font-medium text-slate-600">{a.sourceName}</span>
                      <span className="text-slate-400">scraped {relativeTime(a.scrapedAt)} ago</span>
                      {a.saved ? <span className="rounded bg-amber-50 px-2 py-1 font-medium text-amber-700">saved</span> : null}
                      {!a.readAt ? <span className="rounded bg-emerald-50 px-2 py-1 font-medium text-emerald-700">unread</span> : null}
                    </div>

                    <a className="text-base font-semibold leading-6 text-slate-950 hover:text-emerald-700" href={a.url} target="_blank" rel="noreferrer">
                      {a.title}
                    </a>
                    {a.summary ? <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">{a.summary}</p> : null}
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2 text-xs lg:justify-end">
                    <button className="rounded-md border border-slate-300 px-2 py-1 font-medium text-slate-700 hover:bg-slate-50" onClick={() => void markRead(a.id, true)}>
                      Read
                    </button>
                    <button className="rounded-md border border-slate-300 px-2 py-1 font-medium text-slate-700 hover:bg-slate-50" onClick={() => void markRead(a.id, false)}>
                      Unread
                    </button>
                    <button className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 font-medium text-amber-700 hover:bg-amber-100" onClick={() => void setSaved(a.id, !(a.saved ?? false))}>
                      {(a.saved ?? false) ? 'Unsave' : 'Save'}
                    </button>
                    <button className="rounded-md border border-red-200 bg-red-50 px-2 py-1 font-medium text-red-700 hover:bg-red-100" onClick={() => void setHidden(a.id, true)}>
                      Hide
                    </button>
                    <button className="rounded-md border border-slate-300 px-2 py-1 font-medium text-slate-700 hover:bg-slate-50" onClick={() => setOpenWhy(openWhy === a.id ? null : a.id)}>
                      Why
                    </button>
                  </div>
                </div>

                {openWhy === a.id ? (
                  <div className="mt-4 grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 md:grid-cols-2">
                    <div>
                      <div className="font-semibold text-slate-900">Reason</div>
                      <div className="mt-1 leading-5">{a.interestReason ?? '(none)'}</div>
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">Labels</div>
                      <div className="mt-1 leading-5">{a.interestLabels ?? '(none)'}</div>
                    </div>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
