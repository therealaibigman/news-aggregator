import { db } from '@/server/db';
import * as schema from '@/server/db/schema';
import { eq, sql } from 'drizzle-orm';

export async function POST(req: Request) {
  const body = (await req.json()) as { articleId: string; read: boolean };

  const existing = await db
    .select({ id: schema.articlesRead.id })
    .from(schema.articlesRead)
    .where(eq(schema.articlesRead.articleId, body.articleId))
    .limit(1);

  if (existing[0]?.id) {
    const [row] = await db
      .update(schema.articlesRead)
      .set({ readAt: body.read ? sql`now()` : null })
      .where(eq(schema.articlesRead.id, existing[0].id))
      .returning();
    return Response.json({ ok: true, row });
  }

  const [row] = await db
    .insert(schema.articlesRead)
    .values({ articleId: body.articleId, readAt: body.read ? new Date() : null })
    .returning();

  return Response.json({ ok: true, row });
}
