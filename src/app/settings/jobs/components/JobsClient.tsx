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
    <div className="mt-6">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <button className="rounded border px-2 py-1 hover:bg-gray-50" onClick={dispatch}>
          Dispatch
        </button>
        <button className="rounded border px-2 py-1 hover:bg-gray-50" onClick={runWorker}>
          Run worker
        </button>
        <button className="rounded border px-2 py-1 hover:bg-gray-50" onClick={clear}>
          Clear
        </button>
        <button className="rounded border px-2 py-1 hover:bg-gray-50" onClick={load}>
          Refresh
        </button>
        {msg ? <span className="text-gray-700">{msg}</span> : null}
      </div>

      <div className="mt-6 space-y-2">
        {jobs.map((j) => (
          <div key={j.id} className="rounded border bg-white p-3 text-xs">
            <div className="font-semibold">
              {j.type} · {j.status} · attempts {j.attempts}
            </div>
            <div className="text-gray-600">runAt: {j.runAt}</div>
            {j.lastError ? <div className="mt-1 text-red-700">error: {j.lastError}</div> : null}
            <div className="mt-2 flex items-center gap-2">
              <button className="rounded border px-2 py-1 hover:bg-gray-50" onClick={() => retry(j.id)}>
                Retry now
              </button>
            </div>
            <details className="mt-2">
              <summary className="cursor-pointer underline">payload</summary>
              <pre className="mt-2 max-h-48 overflow-auto rounded bg-gray-50 p-2">{j.payload}</pre>
            </details>
          </div>
        ))}
      </div>
    </div>
  );
}
