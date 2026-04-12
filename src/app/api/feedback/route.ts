import { db } from '@/server/db';
import * as schema from '@/server/db/schema';

export async function POST(req: Request) {
  const body = (await req.json()) as { articleId: string; value: -1 | 1 };
  await db.insert(schema.feedback).values({ articleId: body.articleId, value: body.value });
  return Response.json({ ok: true });
}
