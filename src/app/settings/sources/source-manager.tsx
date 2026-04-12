'use client';

import { useEffect, useState, useTransition } from 'react';

type Row = {
  id: string;
  name: string;
  baseUrl: string;
};

type SettingsSource = {
  source: Row;
  recipe: { kind: string; approved: boolean } | null;
};

export function SourceManager() {
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [rows, setRows] = useState<SettingsSource[]>([]);
  const [preview, setPreview] = useState<unknown>(null);
  const [pending, startTransition] = useTransition();

  async function load() {
    const res = await fetch('/api/sources');
    const sources = (await res.json()) as Row[];
    // recipes are displayed server-side on this page, but for actions we only need source ids.
    setRows(sources.map((s) => ({ source: s, recipe: null })));
  }

  useEffect(() => {
    const t = setTimeout(() => {
      load().catch(() => {});
    }, 0);
    return () => clearTimeout(t);
  }, []);

  async function autoAdd() {
    setMsg(null);
    setPreview(null);
    const res = await fetch('/api/sources/auto', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url, name: name || undefined }),
    });
    const data = await res.json();
    setPreview(data);
    setMsg(data.ok ? `Added. Kind=${data.kind}. Approved=${String(data.approved ?? true)}` : `Error: ${data.error}`);
    startTransition(() => {
      window.location.reload();
    });
  }

  async function testRecipe(sourceId: string) {
    setMsg(null);
    const res = await fetch('/api/recipes/test', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sourceId }),
    });
    const data = await res.json();
    setPreview(data);
    setMsg(data.ok ? 'Test ok (see preview below)' : `Test failed: ${data.error}`);
  }

  async function approve(sourceId: string, approved: boolean) {
    setMsg(null);
    const res = await fetch('/api/recipes/approve', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sourceId, approved }),
    });
    const data = await res.json();
    setMsg(data.ok ? `Updated: approved=${String(approved)}` : `Error: ${data.error}`);
    startTransition(() => {
      window.location.reload();
    });
  }

  return (
    <div className="rounded border bg-white p-4">
      <div className="font-semibold">Add source</div>
      <div className="mt-3 grid gap-2 max-w-2xl">
        <input
          className="rounded border px-2 py-2 text-sm"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com or an article URL"
        />
        <input
          className="rounded border px-2 py-2 text-sm"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Optional name"
        />
        <button
          className="w-fit rounded border px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
          disabled={!url || pending}
          onClick={autoAdd}
        >
          Auto-add (RSS then LLM recipe)
        </button>
        {msg ? <div className="text-sm text-gray-700">{msg}</div> : null}
      </div>

      <div className="mt-6">
        <div className="text-sm font-semibold">Actions</div>
        <div className="mt-2 flex flex-col gap-2">
          {rows.map((r) => (
            <div key={r.source.id} className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-gray-700">{r.source.baseUrl}</span>
              <button className="rounded border px-2 py-1 hover:bg-gray-50" onClick={() => testRecipe(r.source.id)}>
                Test recipe
              </button>
              <button className="rounded border px-2 py-1 hover:bg-gray-50" onClick={() => approve(r.source.id, true)}>
                Approve
              </button>
              <button className="rounded border px-2 py-1 hover:bg-gray-50" onClick={() => approve(r.source.id, false)}>
                Unapprove
              </button>
            </div>
          ))}
        </div>
      </div>

      {preview ? (
        <details className="mt-6">
          <summary className="cursor-pointer text-sm underline">Preview</summary>
          <pre className="mt-2 max-h-80 overflow-auto rounded bg-gray-50 p-3 text-xs">{JSON.stringify(preview, null, 2)}</pre>
        </details>
      ) : null}
    </div>
  );
}
