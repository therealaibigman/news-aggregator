import { db } from '@/server/db';
import * as schema from '@/server/db/schema';
import { eq, sql } from 'drizzle-orm';

export async function POST(req: Request) {
  const body = (await req.json()) as { sourceId: string; approved: boolean };

  const existing = await db
    .select({ id: schema.sourceRecipes.id })
    .from(schema.sourceRecipes)
    .where(eq(schema.sourceRecipes.sourceId, body.sourceId))
    .limit(1);

  if (!existing[0]?.id) return Response.json({ ok: false, error: 'no recipe for source' }, { status: 404 });

  const [row] = await db
    .update(schema.sourceRecipes)
    .set({
      approved: body.approved,
      lastTestedAt: sql`now()`,
      lastTestStatus: body.approved ? 'approved' : 'unapproved',
      lastTestError: null,
    })
    .where(eq(schema.sourceRecipes.id, existing[0].id))
    .returning();

  return Response.json({ ok: true, recipe: row });
}
