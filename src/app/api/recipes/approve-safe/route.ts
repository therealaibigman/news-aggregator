import { db } from '@/server/db';
import * as schema from '@/server/db/schema';
import { eq, sql } from 'drizzle-orm';
import { runRecipePaged } from '@/server/sources/recipe';

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

  if (recipeRow.kind !== 'recipe' && recipeRow.kind !== 'rss') {
    return Response.json({ ok: false, error: `unsupported kind ${recipeRow.kind}` }, { status: 400 });
  }

  try {
    if (recipeRow.kind === 'recipe') {
      const recipe = JSON.parse(recipeRow.content);
      const items = await runRecipePaged(source.baseUrl, recipe);
      if (items.length < 3) throw new Error('recipe validation failed: extracted <3 items');
    }

    const [updated] = await db
      .update(schema.sourceRecipes)
      .set({
        approved: true,
        lastTestedAt: sql`now()`,
        lastTestStatus: 'approved',
        lastTestError: null,
      })
      .where(eq(schema.sourceRecipes.id, recipeRow.id))
      .returning();

    return Response.json({ ok: true, recipe: updated });
  } catch (e: unknown) {
    await db
      .update(schema.sourceRecipes)
      .set({
        approved: false,
        lastTestedAt: sql`now()`,
        lastTestStatus: 'failed',
        lastTestError: String((e as { message?: string } | null)?.message ?? e),
      })
      .where(eq(schema.sourceRecipes.id, recipeRow.id));

    return Response.json({ ok: false, error: String((e as { message?: string } | null)?.message ?? e) }, { status: 400 });
  }
}
