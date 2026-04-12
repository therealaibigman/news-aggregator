import { db } from '@/server/db';
import * as schema from '@/server/db/schema';

export async function GET() {
  const rows = await db.select().from(schema.sources);
  return Response.json(rows);
}

export async function POST(req: Request) {
  const body = (await req.json()) as { name: string; baseUrl: string; refreshMinutes?: number };
  const [row] = await db
    .insert(schema.sources)
    .values({
      name: body.name,
      baseUrl: body.baseUrl,
      refreshMinutes: body.refreshMinutes,
    })
    .onConflictDoNothing()
    .returning();

  return Response.json({ ok: true, source: row ?? null });
}
