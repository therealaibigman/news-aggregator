import { db } from '@/server/db';
import * as schema from '@/server/db/schema';
import { sql } from 'drizzle-orm';

export async function GET() {
  const row = await db.select().from(schema.appSettings).limit(1);
  return Response.json(row[0] ?? null);
}

export async function POST(req: Request) {
  const body = (await req.json()) as { llmProvider?: string; llmModel?: string; useEnvKey?: boolean };

  const existing = await db.select({ id: schema.appSettings.id }).from(schema.appSettings).limit(1);
  if (existing[0]?.id) {
    const [updated] = await db
      .update(schema.appSettings)
      .set({
        llmProvider: body.llmProvider ?? sql`${schema.appSettings.llmProvider}`,
        llmModel: body.llmModel ?? sql`${schema.appSettings.llmModel}`,
        useEnvKey: typeof body.useEnvKey === 'boolean' ? body.useEnvKey : sql`${schema.appSettings.useEnvKey}`,
        updatedAt: sql`now()`,
      })
      .where(sql`${schema.appSettings.id} = ${existing[0].id}`)
      .returning();
    return Response.json({ ok: true, settings: updated });
  }

  const [created] = await db
    .insert(schema.appSettings)
    .values({
      llmProvider: body.llmProvider ?? 'openrouter',
      llmModel: body.llmModel ?? 'openai/gpt-4o-mini',
      useEnvKey: body.useEnvKey ?? true,
    })
    .returning();

  return Response.json({ ok: true, settings: created });
}
