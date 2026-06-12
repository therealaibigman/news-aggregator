import { db } from '@/server/db';
import * as schema from '@/server/db/schema';
import { eq } from 'drizzle-orm';

function baseUrlFrom(input: string) {
  const u = new URL(input);
  return `${u.protocol}//${u.host}`;
}

export async function POST(req: Request) {
  const body = (await req.json()) as {
    url: string;
    title?: string;
    sourceName?: string;
    like?: boolean;
  };

  const baseUrl = baseUrlFrom(body.url);

  const [source] = await db
    .insert(schema.sources)
    .values({
      name: body.sourceName ?? baseUrl,
      baseUrl,
      enabled: true,
    })
    .onConflictDoNothing()
    .returning();

  // If source already existed, fetch it
  const sourceRow =
    source ?? (await db.select().from(schema.sources).where(eq(schema.sources.baseUrl, baseUrl)).limit(1))[0];

  if (!sourceRow) return Response.json({ ok: false, error: 'failed to upsert source' }, { status: 500 });

  const [article] = await db
    .insert(schema.articles)
    .values({
      sourceId: sourceRow.id,
      url: body.url,
      title: body.title ?? body.url,
    })
    .onConflictDoNothing()
    .returning();

  if (typeof body.like === 'boolean' && article?.id) {
    await db.insert(schema.feedback).values({ articleId: article.id, value: body.like ? 1 : -1 });
  }

  return Response.json({ ok: true, source: sourceRow, article: article ?? null });
}
