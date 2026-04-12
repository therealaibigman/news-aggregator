import { db } from '@/server/db';
import * as schema from '@/server/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: Request) {
  const body = (await req.json()) as { articleId: string; saved: boolean };

  const existing = await db
    .select({ id: schema.articlesSaved.id })
    .from(schema.articlesSaved)
    .where(eq(schema.articlesSaved.articleId, body.articleId))
    .limit(1);

  if (existing[0]?.id) {
    const [row] = await db
      .update(schema.articlesSaved)
      .set({ saved: body.saved })
      .where(eq(schema.articlesSaved.id, existing[0].id))
      .returning();
    return Response.json({ ok: true, row });
  }

  const [row] = await db
    .insert(schema.articlesSaved)
    .values({ articleId: body.articleId, saved: body.saved })
    .returning();

  return Response.json({ ok: true, row });
}
