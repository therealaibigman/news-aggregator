import { db } from '@/server/db';
import * as schema from '@/server/db/schema';

export async function POST(req: Request) {
  const body = (await req.json()) as { articleId: string; value: -1 | 1; notes?: string };
  await db
    .insert(schema.feedback)
    .values({ articleId: body.articleId, value: body.value, notes: body.notes });
  return Response.json({ ok: true });
}
