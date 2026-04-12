import { db } from '../db';
import * as schema from '../db/schema';
import { asc, eq, lte, sql } from 'drizzle-orm';
import { refreshSourceById } from '../jobs/refresh';
import { scoreLatestUnscored } from '../scoring/score';

type JobPayload =
  | { type: 'scrape'; sourceId: string }
  | { type: 'score'; limit?: number };

export async function enqueueJob(payload: JobPayload, runAt: Date = new Date()) {
  await db.insert(schema.jobs).values({
    type: payload.type,
    payload: JSON.stringify(payload),
    runAt,
  });
}

export async function runWorkerOnce(maxJobs = 10) {
  const now = new Date();

  const jobs = await db
    .select()
    .from(schema.jobs)
    .where(lte(schema.jobs.runAt, now))
    .orderBy(asc(schema.jobs.runAt))
    .limit(maxJobs);

  let processed = 0;

  for (const j of jobs) {
    if (j.status !== 'queued') continue;

    // Claim job.
    const claimed = await db
      .update(schema.jobs)
      .set({ status: 'running', attempts: sql`${schema.jobs.attempts} + 1`, updatedAt: sql`now()` })
      .where(eq(schema.jobs.id, j.id))
      .returning();

    if (!claimed[0] || claimed[0].status !== 'running') continue;

    const payload = JSON.parse(j.payload) as JobPayload;

    try {
      if (payload.type === 'scrape') {
        const r = await refreshSourceById(payload.sourceId);

        if (r.ok) {
          await db
            .update(schema.sources)
            .set({
              lastStatus: 'ok',
              lastError: null,
              failCount: 0,
              nextRunAt: null,
            })
            .where(eq(schema.sources.id, payload.sourceId));
        } else if (r.skipped) {
          await db
            .update(schema.sources)
            .set({ lastStatus: 'skipped', lastError: r.reason ?? null })
            .where(eq(schema.sources.id, payload.sourceId));
        } else {
          const src = await db
            .select({ failCount: schema.sources.failCount })
            .from(schema.sources)
            .where(eq(schema.sources.id, payload.sourceId))
            .limit(1);
          const fc = (src[0]?.failCount ?? 0) + 1;
          const mins = fc === 1 ? 5 : fc === 2 ? 15 : fc === 3 ? 60 : 360;
          await db
            .update(schema.sources)
            .set({
              lastStatus: 'error',
              lastError: r.error ?? 'unknown',
              failCount: fc,
              nextRunAt: sql`now() + (${mins} || ' minutes')::interval`,
            })
            .where(eq(schema.sources.id, payload.sourceId));
          throw new Error(r.error ?? 'scrape failed');
        }
      } else if (payload.type === 'score') {
        await scoreLatestUnscored(payload.limit ?? 25);
      }

      await db
        .update(schema.jobs)
        .set({ status: 'done', lastError: null, updatedAt: sql`now()` })
        .where(eq(schema.jobs.id, j.id));
    } catch (e: unknown) {
      await db
        .update(schema.jobs)
        .set({ status: 'error', lastError: String((e as { message?: string } | null)?.message ?? e), updatedAt: sql`now()` })
        .where(eq(schema.jobs.id, j.id));
    }

    processed++;
  }

  return { processed };
}
