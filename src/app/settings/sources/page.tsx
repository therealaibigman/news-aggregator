import Link from 'next/link';
import { db } from '@/server/db';
import * as schema from '@/server/db/schema';
import { SourceManager } from './source-manager';

export default async function SourcesSettingsPage() {
  const sources = await db.select().from(schema.sources);
  const recipes = await db.select().from(schema.sourceRecipes);

  const recipeBySource = new Map(recipes.map((r) => [r.sourceId, r] as const));

  const rows = sources.map((s) => ({
    source: s,
    recipe: recipeBySource.get(s.id) ?? null,
  }));

  return (
    <div className="min-h-screen p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Settings: Sources</h1>
        <div className="flex items-center gap-3">
          <Link className="text-sm underline" href="/settings">
            Settings
          </Link>
          <Link className="text-sm underline" href="/">
            Home
          </Link>
        </div>
      </div>

      <div className="mt-6">
        <SourceManager />
      </div>

      <div className="mt-10 space-y-3">
        <div className="text-sm font-semibold">Current sources</div>
        {rows.length === 0 ? (
          <div className="text-sm text-gray-700">No sources yet.</div>
        ) : (
          rows.map(({ source, recipe }) => (
            <div key={source.id} className="rounded border bg-white p-4">
              <div className="font-semibold">{source.name}</div>
              <div className="text-sm text-gray-700">{source.baseUrl}</div>
              <div className="mt-2 text-xs text-gray-600">
                recipe: {recipe ? `${recipe.kind} (approved=${String(recipe.approved)})` : 'none'}
              </div>
              <div className="mt-2 text-xs text-gray-600">
                last: {source.lastRunAt ? source.lastRunAt.toISOString() : 'never'} · status: {source.lastStatus ?? '—'}
                {source.lastError ? ` · error: ${source.lastError}` : ''}
              </div>
              <div className="mt-2 text-xs text-gray-600">
                backoff: failCount={source.failCount} · nextRunAt={source.nextRunAt ? source.nextRunAt.toISOString() : '—'}
              </div>
              <div className="mt-2 text-xs text-gray-600">
                scoring: override={String(source.scoringOverride)} · enabled={String(source.scoringEnabled)}
              </div>
              {recipe ? (
                <details className="mt-3">
                  <summary className="cursor-pointer text-sm underline">View recipe content</summary>
                  <pre className="mt-2 max-h-64 overflow-auto rounded bg-gray-50 p-3 text-xs">{recipe.content}</pre>
                </details>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
