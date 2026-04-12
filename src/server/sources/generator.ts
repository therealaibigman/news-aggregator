import { db } from '../db';
import * as schema from '../db/schema';
import { eq } from 'drizzle-orm';
import { llmJson } from '../llm/client';
import type { LlmProvider } from '../llm/client';
import type { Recipe } from './recipe';

type GenOut = Recipe;

async function getSettings() {
  const row = await db.select().from(schema.appSettings).limit(1);
  if (row[0]) return row[0];
  const [created] = await db.insert(schema.appSettings).values({}).returning();
  return created;
}

export async function generateRecipeForSource(baseUrl: string): Promise<Recipe> {
  const settings = await getSettings();
  const html = await fetch(baseUrl, {
    headers: { 'user-agent': 'news-aggregator/0.1', accept: 'text/html' },
  }).then((r) => r.text());

  const prompt = [
    'You are generating a scraping RECIPE (not code) for a news homepage.',
    'Return ONLY valid JSON matching this schema:',
    '{"version":1,"list":{"itemSelector":string,"linkSelector":string,"titleSelector"?:string,"summarySelector"?:string,"publishedAtSelector"?:string,"maxItems"?:number}}',
    '',
    `Base URL: ${baseUrl}`,
    '',
    'HTML (truncated):',
    html.slice(0, 200_000),
    '',
    'Rules:',
    [
      '- itemSelector should select repeating article cards/rows.',
      '- linkSelector should select an <a> inside the item.',
      '- Prefer stable attributes/classes.',
      '- Keep it minimal.',
      '- maxItems 30.',
    ].join('\n'),
  ].join('\n');

  const out = await llmJson<GenOut>(
    {
      provider: settings.llmProvider as LlmProvider,
      model: settings.scraperLlmModel || settings.llmModel,
      apiKey: process.env.LLM_API_KEY,
    },
    prompt,
  );

  // Basic validation.
  if (out.version !== 1) throw new Error('recipe version must be 1');
  if (!out.list?.itemSelector || !out.list?.linkSelector) throw new Error('recipe missing selectors');
  out.list.maxItems = out.list.maxItems ?? 30;
  return out;
}

export async function upsertRecipe(sourceId: string, kind: 'rss' | 'recipe' | 'code', host: string, content: string, approved: boolean) {
  const existing = await db
    .select({ id: schema.sourceRecipes.id })
    .from(schema.sourceRecipes)
    .where(eq(schema.sourceRecipes.sourceId, sourceId))
    .limit(1);

  if (existing[0]?.id) {
    await db
      .update(schema.sourceRecipes)
      .set({ kind, host, content, approved })
      .where(eq(schema.sourceRecipes.id, existing[0].id));
    return existing[0].id;
  }

  const [row] = await db
    .insert(schema.sourceRecipes)
    .values({ sourceId, kind, host, content, approved })
    .returning();
  return row!.id;
}
