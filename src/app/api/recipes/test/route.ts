import { db } from '@/server/db';
import * as schema from '@/server/db/schema';
import { eq } from 'drizzle-orm';
import { runRecipePaged } from '@/server/sources/recipe';
import { tryExtractFeed } from '@/server/sources/rss';

export async function POST(req: Request) {
  const body = (await req.json()) as { sourceId: string };

  const rec = await db
    .select()
    .from(schema.sourceRecipes)
    .where(eq(schema.sourceRecipes.sourceId, body.sourceId))
    .limit(1);

  const recipeRow = rec[0];
  if (!recipeRow) return Response.json({ ok: false, error: 'no recipe for source' }, { status: 404 });

  const src = await db.select().from(schema.sources).where(eq(schema.sources.id, body.sourceId)).limit(1);
  const source = src[0];
  if (!source) return Response.json({ ok: false, error: 'source not found' }, { status: 404 });

  try {
    if (recipeRow.kind === 'rss') {
      const { feedUrl } = JSON.parse(recipeRow.content) as { feedUrl: string };
      const feed = await tryExtractFeed(feedUrl);
      if (!feed) throw new Error('feed extraction failed');
      return Response.json({ ok: true, kind: 'rss', feedUrl, preview: feed.items.slice(0, 10) });
    }

    if (recipeRow.kind === 'recipe') {
      const recipe = JSON.parse(recipeRow.content);
      const items = await runRecipePaged(source.baseUrl, recipe);
      return Response.json({ ok: true, kind: 'recipe', preview: items.slice(0, 10), recipe });
    }

    return Response.json({ ok: false, error: `unsupported kind ${recipeRow.kind}` }, { status: 400 });
  } catch (e: unknown) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
