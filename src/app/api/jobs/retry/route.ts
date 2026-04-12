import { db } from '@/server/db';
import * as schema from '@/server/db/schema';
import { eq, sql } from 'drizzle-orm';

export async function POST(req: Request) {
  const body = (await req.json()) as { jobId: string };
  const [row] = await db
    .update(schema.jobs)
    .set({ status: 'queued', runAt: sql`now()`, updatedAt: sql`now()` })
    .where(eq(schema.jobs.id, body.jobId))
    .returning();

  return Response.json({ ok: true, job: row ?? null });
}
