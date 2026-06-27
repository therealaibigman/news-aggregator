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

async function readJsonResponse(res: Response) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as { ok?: boolean; error?: string; kind?: string; approved?: boolean };
  } catch {
    return { ok: false, error: text.slice(0, 300) };
  }
}

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
    const data = await readJsonResponse(res);
    setPreview(data);
    const error = data?.error ?? `request failed with status ${res.status}`;
    setMsg(data?.ok && res.ok ? `Added. Kind=${data.kind}. Approved=${String(data.approved ?? true)}` : `Error: ${error}`);
    if (data?.ok && res.ok) {
      startTransition(() => {
        window.location.reload();
      });
    }
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
    if (approved) {
      const res = await fetch('/api/recipes/approve-safe', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sourceId }),
      });
      const data = await res.json();
      setMsg(data.ok ? 'Approved (validated)' : `Approve failed: ${data.error}`);
    } else {
      const res = await fetch('/api/recipes/approve', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sourceId, approved }),
      });
      const data = await res.json();
      setMsg(data.ok ? 'Unapproved' : `Error: ${data.error}`);
    }
    startTransition(() => {
      window.location.reload();
    });
  }

  async function runNow(sourceId: string) {
    setMsg(null);
    // enqueue this source scrape then drain worker
    await fetch('/api/jobs/enqueue', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'scrape', sourceId }),
    });
    const ran = await fetch('/api/jobs/run', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ maxJobs: 25 }),
    });
    const data = await ran.json().catch(() => null);
    setMsg(`Ran worker. processed=${data?.processed ?? '?'}`);
    startTransition(() => window.location.reload());
  }

  async function updateScoring(sourceId: string, scoringOverride: boolean, scoringEnabled: boolean) {
    setMsg(null);
    const res = await fetch('/api/sources/scoring', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sourceId, scoringOverride, scoringEnabled }),
    });
    const data = await res.json();
    setMsg(data.ok ? 'Scoring updated' : `Error: ${data.error}`);
    startTransition(() => window.location.reload());
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-sm font-semibold text-slate-950">Add source</div>
      <div className="mt-3 grid max-w-3xl gap-2">
        <input
          className="h-10 rounded-md border border-slate-300 px-3 text-sm text-slate-950"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com or an article URL"
        />
        <input
          className="h-10 rounded-md border border-slate-300 px-3 text-sm text-slate-950"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Optional name"
        />
        <button
          className="w-fit rounded-md bg-slate-950 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          disabled={!url || pending}
          onClick={autoAdd}
        >
          Auto-add (RSS then LLM recipe)
        </button>
        {msg ? <div className="text-sm text-slate-600">{msg}</div> : null}
      </div>

      <div className="mt-6">
        <div className="text-sm font-semibold text-slate-950">Actions</div>
        <div className="mt-3 grid gap-2">
          {rows.map((r) => (
            <div key={r.source.id} className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
              <div className="mb-2 truncate font-medium text-slate-700">{r.source.baseUrl}</div>
              <div className="flex flex-wrap items-center gap-2">
              <button className="rounded-md border border-slate-300 bg-white px-2 py-1 font-medium text-slate-700 hover:bg-slate-50" onClick={() => testRecipe(r.source.id)}>
                Test recipe
              </button>
              <button className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 font-medium text-emerald-700 hover:bg-emerald-100" onClick={() => approve(r.source.id, true)}>
                Approve
              </button>
              <button className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 font-medium text-amber-700 hover:bg-amber-100" onClick={() => approve(r.source.id, false)}>
                Unapprove
              </button>
              <button className="rounded-md border border-slate-300 bg-white px-2 py-1 font-medium text-slate-700 hover:bg-slate-50" onClick={() => runNow(r.source.id)}>
                Run worker
              </button>
              <button className="rounded-md border border-slate-300 bg-white px-2 py-1 font-medium text-slate-700 hover:bg-slate-50" onClick={() => updateScoring(r.source.id, true, true)}>
                Scoring: ON (override)
              </button>
              <button className="rounded-md border border-slate-300 bg-white px-2 py-1 font-medium text-slate-700 hover:bg-slate-50" onClick={() => updateScoring(r.source.id, true, false)}>
                Scoring: OFF (override)
              </button>
              <button className="rounded-md border border-slate-300 bg-white px-2 py-1 font-medium text-slate-700 hover:bg-slate-50" onClick={() => updateScoring(r.source.id, false, true)}>
                Scoring: Inherit default
              </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {preview ? (
        <details className="mt-6">
          <summary className="cursor-pointer text-sm font-medium text-slate-700">Preview</summary>
          <pre className="mt-2 max-h-80 overflow-auto rounded-md bg-slate-950 p-3 text-xs text-slate-100">{JSON.stringify(preview, null, 2)}</pre>
        </details>
      ) : null}
    </div>
  );
}
