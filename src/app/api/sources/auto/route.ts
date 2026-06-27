import { db } from '@/server/db';
import * as schema from '@/server/db/schema';
import { eq } from 'drizzle-orm';
import { tryExtractFeed } from '@/server/sources/rss';
import { generateRecipeForSource, upsertRecipe } from '@/server/sources/generator';

function getBaseUrl(input: string) {
  const u = new URL(input);
  return `${u.protocol}//${u.host}`;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { url: string; name?: string };
    const inputUrl = new URL(body.url).toString();
    const baseUrl = getBaseUrl(inputUrl);
    const host = new URL(baseUrl).host;

    const [source] = await db
      .insert(schema.sources)
      .values({ name: body.name ?? host, baseUrl, enabled: true })
      .onConflictDoNothing()
      .returning();

    const sourceRow =
      source ?? (await db.select().from(schema.sources).where(eq(schema.sources.baseUrl, baseUrl)).limit(1))[0];
    if (!sourceRow) return Response.json({ ok: false, error: 'failed to upsert source' }, { status: 500 });

    // 1) RSS autodetect. Try the submitted URL first so direct feed URLs with
    // nonstandard paths are not collapsed to the site homepage.
    const feed = (await tryExtractFeed(inputUrl)) ?? (inputUrl === baseUrl ? null : await tryExtractFeed(baseUrl));
    if (feed) {
      await upsertRecipe(sourceRow.id, 'rss', host, JSON.stringify({ feedUrl: feed.feedUrl }), true);
      return Response.json({
        ok: true,
        source: sourceRow,
        kind: 'rss',
        feedUrl: feed.feedUrl,
        preview: feed.items.slice(0, 10),
      });
    }

    // 2) LLM recipe generation (not approved by default)
    const recipe = await generateRecipeForSource(baseUrl);
    await upsertRecipe(sourceRow.id, 'recipe', host, JSON.stringify(recipe), false);

    return Response.json({ ok: true, source: sourceRow, kind: 'recipe', approved: false, recipe });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'failed to add source';
    return Response.json({ ok: false, error: message }, { status: 400 });
  }
}
