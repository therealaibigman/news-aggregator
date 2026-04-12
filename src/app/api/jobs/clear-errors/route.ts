import { db } from '@/server/db';
import * as schema from '@/server/db/schema';
import { eq } from 'drizzle-orm';

export async function POST() {
  // In our worker, errors are re-queued with lastError, so clear "errors" means any job with lastError set.
  await db.delete(schema.jobs).where(eq(schema.jobs.status, 'error'));
  return Response.json({ ok: true });
}
