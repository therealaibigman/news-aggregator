import { db } from '@/server/db';
import * as schema from '@/server/db/schema';
import { eq } from 'drizzle-orm';

export async function POST() {
  const rows = await db.delete(schema.jobs).where(eq(schema.jobs.status, 'queued')).returning({ id: schema.jobs.id });
  return Response.json({ ok: true, deleted: rows.length });
}
