'use client';

import { useCallback, useEffect, useState } from 'react';

type Job = {
  id: string;
  type: string;
  status: string;
  payload: string;
  runAt: string;
  attempts: number;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
};

export function JobsClient() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch('/api/jobs/list', { cache: 'no-store' });
    const data = (await res.json()) as Job[];
    setJobs(data);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  async function runWorker() {
    setMsg(null);
    const res = await fetch('/api/jobs/run', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ maxJobs: 50 }),
    });
    const data = await res.json();
    setMsg(`Worker processed ${data.processed}`);
    await load();
  }

  async function dispatch() {
    setMsg(null);
    const res = await fetch('/api/jobs/dispatch', { method: 'POST' });
    const data = await res.json();
    setMsg(`Dispatched scrapes=${data.enqueued}`);
    await load();
  }

  async function clear() {
    setMsg(null);
    await fetch('/api/jobs/clear', { method: 'POST' });
    setMsg('Cleared jobs');
    await load();
  }

  async function clearDone() {
    setMsg(null);
    await fetch('/api/jobs/clear-done', { method: 'POST' });
    setMsg('Cleared done jobs');
    await load();
  }

  async function clearErrors() {
    setMsg(null);
    await fetch('/api/jobs/clear-errors', { method: 'POST' });
    setMsg('Cleared error jobs');
    await load();
  }

  async function clearQueued() {
    if (!window.confirm('Clear all queued jobs? Running jobs will be left alone.')) return;

    setMsg(null);
    const res = await fetch('/api/jobs/clear-queued', { method: 'POST' });
    const data = (await res.json()) as { deleted?: number };
    setMsg(`Cleared queued jobs${typeof data.deleted === 'number' ? ` (${data.deleted})` : ''}`);
    await load();
  }

  async function retry(jobId: string) {
    setMsg(null);
    await fetch('/api/jobs/retry', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jobId }),
    });
    setMsg('Retried');
    await load();
  }

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2 text-sm">
        <button className="rounded-md bg-slate-950 px-3 py-2 font-medium text-white hover:bg-slate-800" onClick={dispatch}>
          Dispatch
        </button>
        <button className="rounded-md border border-slate-300 px-3 py-2 font-medium text-slate-700 hover:bg-slate-50" onClick={runWorker}>
          Run worker
        </button>
        <button className="rounded-md border border-red-200 bg-red-50 px-3 py-2 font-medium text-red-700 hover:bg-red-100" onClick={clear}>
          Clear done+error
        </button>
        <button className="rounded-md border border-red-200 bg-red-50 px-3 py-2 font-medium text-red-700 hover:bg-red-100" onClick={clearQueued}>
          Clear queued
        </button>
        <button className="rounded-md border border-slate-300 px-3 py-2 font-medium text-slate-700 hover:bg-slate-50" onClick={clearDone}>
          Clear done
        </button>
        <button className="rounded-md border border-slate-300 px-3 py-2 font-medium text-slate-700 hover:bg-slate-50" onClick={clearErrors}>
          Clear errors
        </button>
        <button className="rounded-md border border-slate-300 px-3 py-2 font-medium text-slate-700 hover:bg-slate-50" onClick={load}>
          Refresh
        </button>
        {msg ? <span className="text-slate-600">{msg}</span> : null}
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-950">Queued jobs</h2>
          <p className="text-xs text-slate-500">{jobs.length} rows loaded</p>
        </div>
        {jobs.map((j) => (
          <div key={j.id} className="border-b border-slate-100 p-4 text-xs last:border-b-0">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="font-semibold text-slate-950">
                {j.type} · attempts {j.attempts}
              </div>
              <span
                className={[
                  'w-fit rounded px-2 py-1 font-medium',
                  j.status === 'error'
                    ? 'bg-red-50 text-red-700'
                    : j.status === 'done'
                      ? 'bg-emerald-50 text-emerald-700'
                      : j.status === 'running'
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-slate-100 text-slate-600',
                ].join(' ')}
              >
                {j.status}
              </span>
            </div>
            <div className="mt-1 text-slate-500">runAt: {new Date(j.runAt).toLocaleString()}</div>
            {j.lastError ? <div className="mt-2 rounded-md bg-red-50 p-2 text-red-700">error: {j.lastError}</div> : null}
            <div className="mt-2 flex items-center gap-2">
              <button className="rounded-md border border-slate-300 px-2 py-1 font-medium text-slate-700 hover:bg-slate-50" onClick={() => retry(j.id)}>
                Retry now
              </button>
            </div>
            <details className="mt-2">
              <summary className="cursor-pointer font-medium text-slate-700">payload</summary>
              <pre className="mt-2 max-h-48 overflow-auto rounded-md bg-slate-950 p-3 text-slate-100">{j.payload}</pre>
            </details>
          </div>
        ))}
      </div>
    </div>
  );
}
