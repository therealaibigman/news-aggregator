import { db } from '@/server/db';
import * as schema from '@/server/db/schema';
import { ensureJobLogsTable } from '@/server/jobsq/logs';
import { eq, sql } from 'drizzle-orm';

export async function POST(req: Request) {
  const body = (await req.json()) as { jobId: string };
  const [row] = await db
    .update(schema.jobs)
    .set({ status: 'queued', runAt: sql`now()`, updatedAt: sql`now()` })
    .where(eq(schema.jobs.id, body.jobId))
    .returning();

  if (row) {
    await ensureJobLogsTable();
    await db.insert(schema.jobLogs).values({ jobId: row.id, message: 'Manually retried from Job Queue' });
  }

  return Response.json({ ok: true, job: row ?? null });
}
