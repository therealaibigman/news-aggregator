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

export function ArticlesClient() {
  const [rows, setRows] = useState<Row[]>([]);
  const [unread, setUnread] = useState(true);
  const [savedOnly, setSavedOnly] = useState(false);
  const [minScore, setMinScore] = useState(0);
  const [openWhy, setOpenWhy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const qs = new URLSearchParams();
    qs.set('limit', '100');
    if (unread) qs.set('unread', '1');
    if (savedOnly) qs.set('saved', '1');
    const res = await fetch(`/api/articles/list?${qs.toString()}`, { cache: 'no-store' });
    const data = (await res.json()) as Row[];
    setRows(data);
  }, [unread, savedOnly]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  const filtered = useMemo(() => {
    return rows.filter((r) => (r.interestScore ?? 0) >= minScore);
  }, [rows, minScore]);

  async function markRead(articleId: string, read: boolean) {
    await fetch('/api/articles/read', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ articleId, read }),
    });
    await load();
  }

  async function setHidden(articleId: string, hidden: boolean) {
    await fetch('/api/articles/hide', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ articleId, hidden }),
    });
    await load();
  }

  async function setSaved(articleId: string, saved: boolean) {
    await fetch('/api/articles/save', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ articleId, saved }),
    });
    await load();
  }

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={unread} onChange={(e) => setUnread(e.target.checked)} /> Unread only
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={savedOnly} onChange={(e) => setSavedOnly(e.target.checked)} /> Saved only
        </label>
        <label className="flex items-center gap-2">
          Min score
          <input
            type="number"
            className="w-20 rounded border px-2 py-1"
            value={minScore}
            onChange={(e) => setMinScore(Number(e.target.value))}
          />
        </label>
        <button className="rounded border px-2 py-1 hover:bg-gray-50" onClick={() => load()}>
          Refresh
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
