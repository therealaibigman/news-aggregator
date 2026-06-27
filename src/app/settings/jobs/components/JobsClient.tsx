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

type JobLog = {
  id: string;
  jobId: string;
  level: string;
  message: string;
  createdAt: string;
};

export function JobsClient() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [logs, setLogs] = useState<JobLog[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch('/api/jobs/list', { cache: 'no-store' });
    const data = (await res.json()) as Job[];
    setJobs(data);
  }, []);

  const loadLogs = useCallback(async (jobId: string) => {
    const res = await fetch(`/api/jobs/logs?jobId=${encodeURIComponent(jobId)}`, { cache: 'no-store' });
    const data = (await res.json()) as JobLog[];
    setLogs(data);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => {
    if (!selectedJobId) return;

    const t = window.setTimeout(() => void loadLogs(selectedJobId), 0);
    const interval = window.setInterval(() => void loadLogs(selectedJobId), 3000);
    return () => {
      window.clearTimeout(t);
      window.clearInterval(interval);
    };
  }, [loadLogs, selectedJobId]);

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
    await loadLogs(jobId);
  }

  function selectJob(jobId: string) {
    const next = selectedJobId === jobId ? null : jobId;
    setSelectedJobId(next);
    if (!next) setLogs([]);
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
          <h2 className="text-sm font-semibold text-slate-950">Jobs</h2>
          <p className="text-xs text-slate-500">{jobs.length} rows loaded. Click a job to view its logs.</p>
        </div>
        {jobs.map((j) => (
          <div
            key={j.id}
            className={[
              'cursor-pointer border-b border-slate-100 p-4 text-xs last:border-b-0 hover:bg-slate-50',
              selectedJobId === j.id ? 'bg-slate-50' : '',
            ].join(' ')}
            role="button"
            tabIndex={0}
            onClick={() => selectJob(j.id)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                selectJob(j.id);
              }
            }}
          >
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
              <button
                className="rounded-md border border-slate-300 px-2 py-1 font-medium text-slate-700 hover:bg-slate-50"
                onClick={(event) => {
                  event.stopPropagation();
                  void retry(j.id);
                }}
              >
                Retry now
              </button>
            </div>
            {selectedJobId === j.id ? (
              <div className="mt-3 rounded-md border border-slate-200 bg-white">
                <div className="border-b border-slate-200 px-3 py-2 font-semibold text-slate-950">Logs</div>
                {logs.length > 0 ? (
                  <div className="max-h-72 divide-y divide-slate-100 overflow-auto">
                    {logs.map((log) => (
                      <div key={log.id} className="grid gap-1 px-3 py-2 sm:grid-cols-[10rem_4rem_1fr]">
                        <span className="text-slate-500">{new Date(log.createdAt).toLocaleString()}</span>
                        <span className={log.level === 'error' ? 'font-semibold text-red-700' : 'font-semibold text-slate-600'}>
                          {log.level}
                        </span>
                        <span className="text-slate-800">{log.message}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="px-3 py-3 text-slate-500">No logs for this job yet.</div>
                )}
              </div>
            ) : null}
            <details className="mt-2" onClick={(event) => event.stopPropagation()}>
              <summary className="cursor-pointer font-medium text-slate-700">payload</summary>
              <pre className="mt-2 max-h-48 overflow-auto rounded-md bg-slate-950 p-3 text-slate-100">{j.payload}</pre>
            </details>
          </div>
        ))}
      </div>
    </div>
  );
}
