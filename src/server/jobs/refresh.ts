import { db } from '../db';
import * as schema from '../db/schema';
import { scrapeSource } from '../scrapers';
import { eq } from 'drizzle-orm';
import { runRecipe } from '../sources/recipe';
import { tryExtractFeed } from '../sources/rss';

export async function refreshCointelegraph() {
  const source = await db
    .select()
    .from(schema.sources)
    .where(eq(schema.sources.baseUrl, 'https://cointelegraph.com'))
    .limit(1);

  const sourceId = source[0]?.id;
  if (!sourceId) return;

  const items = await scrapeSource('cointelegraph');

  for (const item of items) {
    await db
      .insert(schema.articles)
      .values({
        sourceId,
        url: item.url,
        title: item.title,
        summary: item.summary,
        publishedAt: item.publishedAt,
      })
      .onConflictDoNothing();
  }
}

export async function refreshFromRecipe(sourceBaseUrl: string) {
  const source = await db
    .select({ id: schema.sources.id, baseUrl: schema.sources.baseUrl })
    .from(schema.sources)
    .where(eq(schema.sources.baseUrl, sourceBaseUrl))
    .limit(1);

  const sourceId = source[0]?.id;
  if (!sourceId) return;

  const rec = await db
    .select()
    .from(schema.sourceRecipes)
    .where(eq(schema.sourceRecipes.sourceId, sourceId))
    .limit(1);

  const r = rec[0];
  if (!r || !r.approved) return;

  if (r.kind === 'rss') {
    const { feedUrl } = JSON.parse(r.content) as { feedUrl: string };
    const feed = await tryExtractFeed(feedUrl);
    if (!feed) return;
    for (const item of feed.items) {
      await db
        .insert(schema.articles)
        .values({
          sourceId,
          url: item.url,
          title: item.title,
          summary: item.summary,
          publishedAt: item.publishedAt,
        })
        .onConflictDoNothing();
    }
    return;
  }

  if (r.kind === 'recipe') {
    const recipe = JSON.parse(r.content);
    const items = await runRecipe(sourceBaseUrl, recipe);
    for (const item of items) {
      await db
        .insert(schema.articles)
        .values({ sourceId, url: item.url, title: item.title, summary: item.summary })
        .onConflictDoNothing();
    }
  }
}

export async function refreshSourceById(sourceId: string) {
  const src = await db.select().from(schema.sources).where(eq(schema.sources.id, sourceId)).limit(1);
  const source = src[0];
  if (!source || !source.enabled) return { ok: false, skipped: true as const };

  // Respect global default unless overridden per source.
  const settings = await db.select().from(schema.appSettings).limit(1);
  const defaultScoring = settings[0]?.scoringDefaultEnabled ?? true;
  const effectiveScoring = source.scoringOverride ? source.scoringEnabled : defaultScoring;

  const rec = await db
    .select()
    .from(schema.sourceRecipes)
    .where(eq(schema.sourceRecipes.sourceId, sourceId))
    .limit(1);

  const recipeRow = rec[0];
  if (!recipeRow || !recipeRow.approved) {
    return { ok: false, skipped: true as const, reason: 'no approved recipe' };
  }

  try {
    if (recipeRow.kind === 'rss') {
      const { feedUrl } = JSON.parse(recipeRow.content) as { feedUrl: string };
      const feed = await tryExtractFeed(feedUrl);
      if (!feed) throw new Error('feed extraction failed');
      for (const item of feed.items) {
        await db
          .insert(schema.articles)
          .values({
            sourceId,
            url: item.url,
            title: item.title,
            summary: item.summary,
            publishedAt: item.publishedAt,
          })
          .onConflictDoNothing();
      }
    } else if (recipeRow.kind === 'recipe') {
      const recipe = JSON.parse(recipeRow.content);
      const items = await runRecipe(source.baseUrl, recipe);
      for (const item of items) {
        await db
          .insert(schema.articles)
          .values({ sourceId, url: item.url, title: item.title, summary: item.summary })
          .onConflictDoNothing();
      }
    } else {
      throw new Error(`unsupported kind ${recipeRow.kind}`);
    }

    return { ok: true as const, effectiveScoring };
  } catch (e: unknown) {
    return { ok: false as const, error: String((e as { message?: string } | null)?.message ?? e) };
  }
}
