import { db } from '@/server/db';
import * as schema from '@/server/db/schema';
import { eq, sql } from 'drizzle-orm';

export async function POST(req: Request) {
  const body = (await req.json()) as {
    sourceId: string;
    scoringOverride: boolean;
    scoringEnabled: boolean;
  };

  const [row] = await db
    .update(schema.sources)
    .set({
      scoringOverride: body.scoringOverride,
      scoringEnabled: body.scoringEnabled,
      lastStatus: sql`${schema.sources.lastStatus}`,
    })
    .where(eq(schema.sources.id, body.sourceId))
    .returning();

  return Response.json({ ok: true, source: row });
}
