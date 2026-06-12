import Link from 'next/link';
import { AppShell } from '../components/AppShell';
import { SettingsForm } from './settings-form';

export default function SettingsPage() {
  return (
    <AppShell title="Settings" description="Source operations, queue controls, provider settings, and preference maintenance.">
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-semibold text-slate-950">Sources</div>
          <div className="mt-1 text-sm leading-6 text-slate-600">Add sources, test generated recipes, approve scrapers, and run source-level jobs.</div>
          <div className="mt-4">
            <Link className="rounded-md bg-slate-950 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800" href="/settings/sources">
              Manage sources
            </Link>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-semibold text-slate-950">Jobs</div>
          <div className="mt-1 text-sm leading-6 text-slate-600">Inspect the queue, dispatch due work, run the worker, retry failures, and clear completed rows.</div>
          <div className="mt-4">
            <Link className="rounded-md bg-slate-950 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800" href="/settings/jobs">
              Manage jobs
            </Link>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:col-span-2">
          <div className="text-sm font-semibold text-slate-950">LLM provider</div>
          <div className="mt-1 text-sm leading-6 text-slate-600">
            Choose provider and model. API keys stay in <code className="rounded bg-slate-100 px-1">.env</code>.
          </div>
          <div className="mt-4">
            <SettingsForm />
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-semibold text-slate-950">Preference summary</div>
          <div className="mt-1 text-sm leading-6 text-slate-600">Regenerate the compact, LLM-readable summary of likes and dislikes.</div>
          <div className="mt-4 flex flex-wrap gap-2">
            <form action="/api/prefs" method="post">
              <button className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" type="submit">
                Regenerate
              </button>
            </form>
            <a className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" href="/api/prefs" target="_blank" rel="noreferrer">
              View JSON
            </a>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-semibold text-slate-950">Scheduler</div>
          <div className="mt-1 text-sm leading-6 text-slate-600">
            Run <code className="rounded bg-slate-100 px-1">npm run job:scheduler</code>. It uses{' '}
            <code className="rounded bg-slate-100 px-1">REFRESH_MINUTES</code> from <code className="rounded bg-slate-100 px-1">.env</code>.
          </div>
        </section>
      </div>
    </AppShell>
  );
}
