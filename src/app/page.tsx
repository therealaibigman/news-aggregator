import Link from 'next/link';
import { ArticleList } from './components/ArticleList';
import { AppShell, EmptyState, StatTile } from './components/AppShell';
import { db } from '@/server/db';
import * as schema from '@/server/db/schema';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const sources = await db.select().from(schema.sources);
  const enabled = sources.filter((s) => s.enabled).length;
  const failing = sources.filter((s) => s.lastStatus === 'error' || s.failCount > 0).length;
  const pendingBackoff = sources.filter((s) => s.nextRunAt && s.nextRunAt > new Date()).length;

  return (
    <AppShell
      title="Dashboard"
      description="Source health, fresh intake, and quick access to the scoring workflow."
      actions={
        <>
          <Link className="rounded-md bg-slate-950 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800" href="/articles">
            Review articles
          </Link>
          <Link className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" href="/settings/sources">
            Manage sources
          </Link>
        </>
      }
    >
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Sources" value={sources.length} detail={`${enabled} enabled`} />
        <StatTile label="Attention" value={failing} detail="sources with errors or failures" />
        <StatTile label="Backoff" value={pendingBackoff} detail="sources waiting before retry" />
        <StatTile label="Workflow" value="Top 100" detail="latest articles loaded below" />
      </section>

      <section className="mt-6 rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-950">Sources</h2>
            <p className="text-xs text-slate-500">Refresh cadence, status, and scraping backoff.</p>
          </div>
          <Link className="text-sm font-medium text-emerald-700 hover:text-emerald-900" href="/settings/sources">
            Configure
          </Link>
        </div>

        {sources.length === 0 ? (
          <div className="p-4">
            <EmptyState>No sources yet. Add RSS feeds or recipe-backed sites from source settings.</EmptyState>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {sources.map((s) => (
              <div key={s.id} className="grid gap-3 px-4 py-3 text-sm md:grid-cols-[minmax(0,1fr)_140px_160px_120px] md:items-center">
                <div className="min-w-0">
                  <div className="truncate font-medium text-slate-950">{s.name}</div>
                  <div className="truncate text-xs text-slate-500">{s.baseUrl}</div>
                </div>
                <div className="text-xs text-slate-600">
                  every {s.refreshMinutes ?? 'env'} min
                </div>
                <div className="text-xs text-slate-600">
                  {s.lastRunAt ? s.lastRunAt.toLocaleString() : 'never run'}
                </div>
                <div>
                  <span
                    className={[
                      'inline-flex rounded px-2 py-1 text-xs font-medium',
                      s.lastStatus === 'error'
                        ? 'bg-red-50 text-red-700'
                        : s.enabled
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-100 text-slate-600',
                    ].join(' ')}
                  >
                    {s.lastStatus ?? (s.enabled ? 'enabled' : 'disabled')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <ArticleList />
    </AppShell>
  );
}
