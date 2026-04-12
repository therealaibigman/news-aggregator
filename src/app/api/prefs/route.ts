import { db } from '@/server/db';
import * as schema from '@/server/db/schema';
import { eq } from 'drizzle-orm';
import { buildGlobalPreferenceSummary } from '@/server/prefs/summarize';

export async function GET() {
  const row = await db
    .select({ content: schema.preferenceSummaries.content, updatedAt: schema.preferenceSummaries.updatedAt })
    .from(schema.preferenceSummaries)
    .where(eq(schema.preferenceSummaries.kind, 'global'))
    .limit(1);

  return Response.json({
    kind: 'global',
    content: row[0]?.content ?? '',
    updatedAt: row[0]?.updatedAt ?? null,
  });
}

export async function POST() {
  const content = await buildGlobalPreferenceSummary();
  return Response.json({ ok: true, content });
}
