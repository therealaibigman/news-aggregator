import { db } from '../db';
import * as schema from '../db/schema';
import { eq, sql } from 'drizzle-orm';
import { refreshSourceById } from '../jobs/refresh';
import { scoreLatestUnscored } from '../scoring/score';

type JobPayload =
  | { type: 'scrape'; sourceId: string }
  | { type: 'score'; limit?: number };

type ClaimedJobRow = {
  id: string;
  type: string;
  status: string;
  payload: string;
  attempts: number;
};

export async function enqueueJob(payload: JobPayload, runAt: Date = new Date()) {
  await db.insert(schema.jobs).values({
    type: payload.type,
    payload: JSON.stringify(payload),
    runAt,
  });
}

export async function runWorkerOnce(maxJobs = 10) {
  const now = new Date();

  let processed = 0;

  for (let i = 0; i < maxJobs; i++) {
    // Atomic-ish claim: pick one queued job due now and flip it to running.
    const claimed = await db.execute(sql`
      update jobs
      set status = 'running', attempts = attempts + 1, updated_at = now()
      where id = (
        select id from jobs
        where status = 'queued' and run_at <= ${now}
        order by run_at asc
        for update skip locked
        limit 1
      )
      returning id, type, status, payload, attempts;
    `);

    // drizzle returns rows differently depending on driver, normalize.
    const result = claimed as unknown as { rows?: ClaimedJobRow[] } | ClaimedJobRow[];
    const row = Array.isArray(result) ? result[0] : result.rows?.[0] ?? null;
    if (!row?.id) break;

    const payload = JSON.parse(row.payload) as JobPayload;

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
        .where(eq(schema.jobs.id, row.id));
    } catch (e: unknown) {
      // Job retry backoff: 10s, 30s, 2m, 10m, 1h
      const msg = String((e as { message?: string } | null)?.message ?? e);
      const att = Number(row.attempts ?? 1);
      const secs = att === 1 ? 10 : att === 2 ? 30 : att === 3 ? 120 : att === 4 ? 600 : 3600;
      await db
        .update(schema.jobs)
        .set({
          status: 'queued',
          lastError: msg,
          runAt: sql`now() + (${secs} || ' seconds')::interval`,
          updatedAt: sql`now()`,
        })
        .where(eq(schema.jobs.id, row.id));
    }

    processed++;
  }

  return { processed };
}
