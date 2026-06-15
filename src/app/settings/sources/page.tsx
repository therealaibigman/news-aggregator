import { AppShell, EmptyState } from '@/app/components/AppShell';
import { db } from '@/server/db';
import * as schema from '@/server/db/schema';
import { SourceManager } from './source-manager';

export const dynamic = 'force-dynamic';

export default async function SourcesSettingsPage() {
  const sources = await db.select().from(schema.sources);
  const recipes = await db.select().from(schema.sourceRecipes);

  const recipeBySource = new Map(recipes.map((r) => [r.sourceId, r] as const));

  const rows = sources.map((s) => ({
    source: s,
    recipe: recipeBySource.get(s.id) ?? null,
  }));

  return (
    <AppShell title="Source Settings" description="Add feeds, approve generated recipes, trigger workers, and inspect source health.">
      <SourceManager />

      <section className="mt-6 rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-950">Current sources</h2>
          <p className="text-xs text-slate-500">Recipe status, backoff, scoring override, and last run details.</p>
        </div>

        {rows.length === 0 ? (
          <div className="p-4">
            <EmptyState>No sources yet.</EmptyState>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {rows.map(({ source, recipe }) => (
              <article key={source.id} className="p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-950">{source.name}</div>
                    <div className="truncate text-sm text-slate-500">{source.baseUrl}</div>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="rounded bg-slate-100 px-2 py-1 font-medium text-slate-600">
                      {recipe ? `${recipe.kind} recipe` : 'no recipe'}
                    </span>
                    <span className={['rounded px-2 py-1 font-medium', recipe?.approved ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'].join(' ')}>
                      {recipe?.approved ? 'approved' : 'unapproved'}
                    </span>
                    <span className={['rounded px-2 py-1 font-medium', source.enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'].join(' ')}>
                      {source.enabled ? 'enabled' : 'disabled'}
                    </span>
                  </div>
                </div>

                <dl className="mt-4 grid gap-3 text-xs text-slate-600 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <dt className="font-medium uppercase text-slate-400">Last run</dt>
                    <dd className="mt-1">{source.lastRunAt ? source.lastRunAt.toLocaleString() : 'never'}</dd>
                  </div>
                  <div>
                    <dt className="font-medium uppercase text-slate-400">Status</dt>
                    <dd className="mt-1">{source.lastStatus ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="font-medium uppercase text-slate-400">Backoff</dt>
                    <dd className="mt-1">fail {source.failCount} · next {source.nextRunAt ? source.nextRunAt.toLocaleString() : '—'}</dd>
                  </div>
                  <div>
                    <dt className="font-medium uppercase text-slate-400">Scoring</dt>
                    <dd className="mt-1">{source.scoringOverride ? `override ${String(source.scoringEnabled)}` : 'inherits default'}</dd>
                  </div>
                </dl>

                {source.lastError ? <div className="mt-3 rounded-md bg-red-50 p-3 text-xs text-red-700">{source.lastError}</div> : null}

                {recipe ? (
                  <details className="mt-3">
                    <summary className="cursor-pointer text-sm font-medium text-slate-700">View recipe content</summary>
                    <pre className="mt-2 max-h-64 overflow-auto rounded-md bg-slate-950 p-3 text-xs text-slate-100">{recipe.content}</pre>
                  </details>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
