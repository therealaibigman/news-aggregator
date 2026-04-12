import { db } from '@/server/db';
import * as schema from '@/server/db/schema';

export async function POST() {
  // MVP admin action: clear done/error jobs.
  await db.delete(schema.jobs);
  return Response.json({ ok: true });
}
