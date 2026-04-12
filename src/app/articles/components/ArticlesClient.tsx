'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

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

export function ArticlesClient() {
  const [rows, setRows] = useState<Row[]>([]);
  const [filters, setFilters] = useState<Filters>(() => {
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
  });
  const [openWhy, setOpenWhy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const qs = new URLSearchParams();
    qs.set('limit', '100');
    if (filters.unread) qs.set('unread', '1');
    if (filters.savedOnly) qs.set('saved', '1');
    const res = await fetch(`/api/articles/list?${qs.toString()}`, { cache: 'no-store' });
    const data = (await res.json()) as Row[];
    setRows(data);
  }, [filters.unread, filters.savedOnly]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  const sources = useMemo(() => {
    const s = Array.from(new Set(rows.map((r) => r.baseUrl))).sort();
    return s;
  }, [rows]);

  const filtered = useMemo(() => {
    const f = rows
      .filter((r) => (r.interestScore ?? 0) >= filters.minScore)
      .filter((r) => (filters.source ? r.baseUrl === filters.source : true));

    if (filters.sort === 'score') {
      f.sort((a, b) => (b.interestScore ?? -1) - (a.interestScore ?? -1));
    }
    return f;
  }, [rows, filters.minScore, filters.sort, filters.source]);

  useEffect(() => {
    localStorage.setItem(
      'articles.filters',
      JSON.stringify(filters),
    );
  }, [filters]);

  async function bulk(action: 'read' | 'unread' | 'save' | 'unsave' | 'hide') {
    const ids = filtered.slice(0, 50).map((r) => r.id);
    for (const id of ids) {
      if (action === 'read') await markRead(id, true);
      if (action === 'unread') await markRead(id, false);
      if (action === 'save') await setSaved(id, true);
      if (action === 'unsave') await setSaved(id, false);
      if (action === 'hide') await setHidden(id, true);
    }
    await load();
  }

  async function markRead(articleId: string, read: boolean) {
    await fetch('/api/articles/read', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ articleId, read }),
    });
    // avoid N reloads in bulk loops
  }

  async function setHidden(articleId: string, hidden: boolean) {
    await fetch('/api/articles/hide', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ articleId, hidden }),
    });
    // avoid N reloads in bulk loops
  }

  async function setSaved(articleId: string, saved: boolean) {
    await fetch('/api/articles/save', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ articleId, saved }),
    });
    // avoid N reloads in bulk loops
  }

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={filters.unread}
            onChange={(e) => setFilters({ ...filters, unread: e.target.checked })}
          />
          Unread only
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={filters.savedOnly}
            onChange={(e) => setFilters({ ...filters, savedOnly: e.target.checked })}
          />
          Saved only
        </label>
        <label className="flex items-center gap-2">
          Min score
          <input
            type="number"
            className="w-20 rounded border px-2 py-1"
            value={filters.minScore}
            onChange={(e) => setFilters({ ...filters, minScore: Number(e.target.value) })}
          />
        </label>
        <label className="flex items-center gap-2">
          Sort
          <select
            className="rounded border px-2 py-1"
            value={filters.sort}
            onChange={(e) => setFilters({ ...filters, sort: e.target.value === 'score' ? 'score' : 'new' })}
          >
            <option value="new">Newest</option>
            <option value="score">Score</option>
          </select>
        </label>
        <label className="flex items-center gap-2">
          Source
          <select
            className="max-w-[240px] rounded border px-2 py-1"
            value={filters.source}
            onChange={(e) => setFilters({ ...filters, source: e.target.value })}
          >
            <option value="">All</option>
            {sources.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <button className="rounded border px-2 py-1 hover:bg-gray-50" onClick={() => load()}>
          Refresh
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="text-gray-600">Bulk (first 50 in view):</span>
        <button className="rounded border px-2 py-1 hover:bg-gray-50" onClick={() => bulk('read')}>
          Mark read
        </button>
        <button className="rounded border px-2 py-1 hover:bg-gray-50" onClick={() => bulk('unread')}>
          Mark unread
        </button>
        <button className="rounded border px-2 py-1 hover:bg-gray-50" onClick={() => bulk('save')}>
          Save
        </button>
        <button className="rounded border px-2 py-1 hover:bg-gray-50" onClick={() => bulk('unsave')}>
          Unsave
        </button>
        <button className="rounded border px-2 py-1 hover:bg-gray-50" onClick={() => bulk('hide')}>
          Hide
        </button>
      </div>

      <div className="mt-6 space-y-2">
        {filtered.map((a) => (
          <div key={a.id} className="rounded border bg-white p-3">
            <div className="text-xs text-gray-500">
              {a.sourceName} · score {a.interestScore ?? '—'} · likes {a.likes} / dislikes {a.dislikes}
            </div>
            <a className="font-medium underline" href={a.url} target="_blank" rel="noreferrer">
              {a.title}
            </a>
            {a.summary ? <div className="mt-1 text-sm text-gray-700">{a.summary}</div> : null}

            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <button className="rounded border px-2 py-1 hover:bg-gray-50" onClick={() => markRead(a.id, true)}>
                Mark read
              </button>
              <button className="rounded border px-2 py-1 hover:bg-gray-50" onClick={() => markRead(a.id, false)}>
                Mark unread
              </button>
              <button className="rounded border px-2 py-1 hover:bg-gray-50" onClick={() => setSaved(a.id, !(a.saved ?? false))}>
                {(a.saved ?? false) ? 'Unsave' : 'Save'}
              </button>
              <button className="rounded border px-2 py-1 hover:bg-gray-50" onClick={() => setHidden(a.id, true)}>
                Hide
              </button>
              <button className="rounded border px-2 py-1 hover:bg-gray-50" onClick={() => setHidden(a.id, false)}>
                Unhide
              </button>
              <button className="ml-auto rounded border px-2 py-1 hover:bg-gray-50" onClick={() => setOpenWhy(openWhy === a.id ? null : a.id)}>
                Why
              </button>
            </div>

            {openWhy === a.id ? (
              <div className="mt-3 rounded bg-gray-50 p-3 text-xs">
                <div className="font-semibold">Reason</div>
                <div className="mt-1">{a.interestReason ?? '(none)'} </div>
                <div className="mt-2 font-semibold">Labels</div>
                <div className="mt-1">{a.interestLabels ?? '(none)'} </div>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
