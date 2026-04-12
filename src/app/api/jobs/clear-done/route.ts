import { db } from '@/server/db';
import * as schema from '@/server/db/schema';
import { eq } from 'drizzle-orm';

export async function POST() {
  await db.delete(schema.jobs).where(eq(schema.jobs.status, 'done'));
  return Response.json({ ok: true });
}
