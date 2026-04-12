import Link from 'next/link';
import { SettingsForm } from './settings-form';

export default function SettingsPage() {
  return (
    <div className="min-h-screen p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Settings</h1>
        <Link className="text-sm underline" href="/">
          Back
        </Link>
      </div>

      <div className="mt-6 space-y-4">
        <section className="rounded border bg-white p-4">
          <div className="font-semibold">Sources</div>
          <div className="mt-1 text-sm text-gray-700">Add sources, test generated recipes, and approve them.</div>
          <div className="mt-3">
            <Link className="text-sm underline" href="/settings/sources">
              Manage sources
            </Link>
          </div>
        </section>

        <section className="rounded border bg-white p-4">
          <div className="font-semibold">LLM provider</div>
          <div className="mt-1 text-sm text-gray-700">
            Choose provider + model. API key stays in <code className="rounded bg-gray-100 px-1">.env</code> for now.
          </div>
          <div className="mt-3">
            <SettingsForm />
          </div>
        </section>

        <section className="rounded border bg-white p-4">
          <div className="font-semibold">Preference summary (LLM-readable)</div>
          <div className="mt-1 text-sm text-gray-700">
            This generates a compact, interpretable summary of your likes/dislikes for feeding into an LLM.
          </div>

          <div className="mt-3 flex flex-col gap-2">
            <form action="/api/prefs" method="post">
              <button className="w-fit rounded border px-3 py-2 text-sm hover:bg-gray-50" type="submit">
                Regenerate summary
              </button>
            </form>
            <a className="text-sm underline" href="/api/prefs" target="_blank" rel="noreferrer">
              View current summary (opens JSON)
            </a>
          </div>
        </section>

        <section className="rounded border bg-white p-4">
          <div className="font-semibold">Scheduler</div>
          <div className="mt-1 text-sm text-gray-700">
            Run the scheduler via <code className="rounded bg-gray-100 px-1">npm run job:scheduler</code>. It uses
            <code className="rounded bg-gray-100 px-1 ml-1">REFRESH_MINUTES</code> from <code className="rounded bg-gray-100 px-1">.env</code>.
          </div>
        </section>
      </div>
    </div>
  );
}
