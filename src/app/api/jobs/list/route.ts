import { db } from '@/server/db';
import * as schema from '@/server/db/schema';
import { desc } from 'drizzle-orm';

export async function GET() {
  const rows = await db.select().from(schema.jobs).orderBy(desc(schema.jobs.createdAt)).limit(200);
  return Response.json(rows);
}
