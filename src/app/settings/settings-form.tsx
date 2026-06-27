'use client';

import { useEffect, useState } from 'react';

type Settings = {
  llmProvider: string;
  llmModel: string;
  scraperLlmModel: string;
  scoringDefaultEnabled: boolean;
  useEnvKey: boolean;
} | null;

export function SettingsForm() {
  const [settings, setSettings] = useState<Settings>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/settings', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setSettings(d))
      .catch(() =>
        setSettings({
          llmProvider: 'openrouter',
          llmModel: 'openai/gpt-4o-mini',
          scraperLlmModel: 'openai/gpt-4o-mini',
          scoringDefaultEnabled: true,
          useEnvKey: true,
        }),
      );
  }, []);

  async function save() {
    if (!settings) return;
    setSaving(true);
    setMsg(null);
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(settings),
    });
    const data = await res.json();
    setSettings(data.settings);
    setSaving(false);
    setMsg('Saved');
    setTimeout(() => setMsg(null), 1500);
  }

  if (!settings) return <div className="text-sm text-slate-500">Loading...</div>;

  const riskyScoringModel = /(:free|omni|vision|reasoning)/i.test(settings.llmModel);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium uppercase text-slate-500">Provider</label>
        <select
          className="h-9 w-fit rounded-md border border-slate-300 px-2 text-sm text-slate-950"
          value={settings.llmProvider}
          onChange={(e) => setSettings({ ...settings, llmProvider: e.target.value })}
        >
          <option value="openrouter">OpenRouter</option>
          <option value="openai">OpenAI</option>
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium uppercase text-slate-500">Model</label>
        <input
          className="h-9 w-full rounded-md border border-slate-300 px-2 text-sm text-slate-950"
          value={settings.llmModel}
          onChange={(e) => setSettings({ ...settings, llmModel: e.target.value })}
          placeholder="openai/gpt-4o-mini"
        />
        <div className="text-xs text-slate-500">Free-form model id supported by the provider.</div>
        {riskyScoringModel ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs leading-5 text-amber-800">
            This model may return empty or non-JSON scoring responses. Prefer a JSON-capable text/chat model.
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium uppercase text-slate-500">Scraper generation model</label>
        <input
          className="h-9 w-full rounded-md border border-slate-300 px-2 text-sm text-slate-950"
          value={settings.scraperLlmModel}
          onChange={(e) => setSettings({ ...settings, scraperLlmModel: e.target.value })}
          placeholder="openai/gpt-4o-mini"
        />
        <div className="text-xs text-slate-500">Used when generating source recipes.</div>
      </div>

      <div className="flex flex-col justify-end gap-3">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input
            id="useEnvKey"
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300"
            checked={settings.useEnvKey}
            onChange={(e) => setSettings({ ...settings, useEnvKey: e.target.checked })}
          />
          Use API key from .env
        </label>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input
            id="scoringDefaultEnabled"
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300"
            checked={settings.scoringDefaultEnabled}
            onChange={(e) => setSettings({ ...settings, scoringDefaultEnabled: e.target.checked })}
          />
          Enable scoring by default
        </label>
      </div>

      <div className="flex items-center gap-3 md:col-span-2">
        <button
          className="rounded-md bg-slate-950 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          disabled={saving}
          onClick={save}
        >
          Save settings
        </button>
        {msg ? <div className="text-sm text-emerald-700">{msg}</div> : null}
      </div>
    </div>
  );
}
