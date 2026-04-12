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

  if (!settings) return <div className="text-sm text-gray-600">Loading…</div>;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-1">
        <label className="text-sm">Provider</label>
        <select
          className="w-fit rounded border px-2 py-1"
          value={settings.llmProvider}
          onChange={(e) => setSettings({ ...settings, llmProvider: e.target.value })}
        >
          <option value="openrouter">OpenRouter</option>
          <option value="openai">OpenAI</option>
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm">Model</label>
        <input
          className="w-full max-w-xl rounded border px-2 py-1"
          value={settings.llmModel}
          onChange={(e) => setSettings({ ...settings, llmModel: e.target.value })}
          placeholder="openai/gpt-4o-mini"
        />
        <div className="text-xs text-gray-600">Free-form. Use any model id your provider supports.</div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm">Scraper generation model</label>
        <input
          className="w-full max-w-xl rounded border px-2 py-1"
          value={settings.scraperLlmModel}
          onChange={(e) => setSettings({ ...settings, scraperLlmModel: e.target.value })}
          placeholder="openai/gpt-4o-mini"
        />
        <div className="text-xs text-gray-600">Defaults to the main model. Used only when generating new source recipes.</div>
      </div>

      <div className="flex items-center gap-2">
        <input
          id="useEnvKey"
          type="checkbox"
          checked={settings.useEnvKey}
          onChange={(e) => setSettings({ ...settings, useEnvKey: e.target.checked })}
        />
        <label htmlFor="useEnvKey" className="text-sm">
          Use API key from .env
        </label>
      </div>

      <div className="flex items-center gap-2">
        <input
          id="scoringDefaultEnabled"
          type="checkbox"
          checked={settings.scoringDefaultEnabled}
          onChange={(e) => setSettings({ ...settings, scoringDefaultEnabled: e.target.checked })}
        />
        <label htmlFor="scoringDefaultEnabled" className="text-sm">
          Enable scoring by default
        </label>
      </div>

      <div className="flex items-center gap-3">
        <button
          className="w-fit rounded border px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
          disabled={saving}
          onClick={save}
        >
          Save
        </button>
        {msg ? <div className="text-sm text-gray-700">{msg}</div> : null}
      </div>
    </div>
  );
}
