import { db } from '@/server/db';
import * as schema from '@/server/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: Request) {
  const body = (await req.json()) as { articleId: string; hidden: boolean };

  const existing = await db
    .select({ id: schema.articlesHidden.id })
    .from(schema.articlesHidden)
    .where(eq(schema.articlesHidden.articleId, body.articleId))
    .limit(1);

  if (existing[0]?.id) {
    const [row] = await db
      .update(schema.articlesHidden)
      .set({ hidden: body.hidden })
      .where(eq(schema.articlesHidden.id, existing[0].id))
      .returning();
    return Response.json({ ok: true, row });
  }

  const [row] = await db
    .insert(schema.articlesHidden)
    .values({ articleId: body.articleId, hidden: body.hidden })
    .returning();

  return Response.json({ ok: true, row });
}
