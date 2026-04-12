import { db } from '@/server/db';
import * as schema from '@/server/db/schema';
import { inArray } from 'drizzle-orm';

export async function POST() {
  // Clear only finished jobs.
  await db.delete(schema.jobs).where(inArray(schema.jobs.status, ['done', 'error']));
  return Response.json({ ok: true });
}
