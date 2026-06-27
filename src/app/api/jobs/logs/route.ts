import { db } from '@/server/db';
import * as schema from '@/server/db/schema';
import { ensureJobLogsTable } from '@/server/jobsq/logs';
import { asc, eq } from 'drizzle-orm';

export async function GET(req: Request) {
  const jobId = new URL(req.url).searchParams.get('jobId');
  if (!jobId) return Response.json({ ok: false, error: 'jobId required' }, { status: 400 });

  await ensureJobLogsTable();

  const rows = await db
    .select()
    .from(schema.jobLogs)
    .where(eq(schema.jobLogs.jobId, jobId))
    .orderBy(asc(schema.jobLogs.createdAt))
    .limit(200);

  return Response.json(rows);
}
