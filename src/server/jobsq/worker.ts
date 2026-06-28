import { db } from '../db';
import * as schema from '../db/schema';
import { eq, sql } from 'drizzle-orm';
import { refreshSourceById } from '../jobs/refresh';
import { LlmRateLimitError } from '../llm/client';
import { createLogger } from '../logging/logger';
import { scoreLatestUnscored } from '../scoring/score';
import { ensureJobLogsTable } from './logs';

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

const logger = createLogger('jobs.worker');

async function writeJobLog(jobId: string, message: string, level: 'info' | 'error' = 'info') {
  try {
    await ensureJobLogsTable();
    await db.insert(schema.jobLogs).values({ jobId, message, level });
  } catch (e) {
    logger.error('job_log_write_failed', { jobId, message, level, error: e });
  }
}

export function retryDelaySeconds(attempt: number, error: unknown) {
  const cappedAttempt = Math.max(1, Math.min(attempt, 8));
  const baseSeconds = error instanceof LlmRateLimitError ? 60 : 10;
  const capSeconds = error instanceof LlmRateLimitError ? 60 * 60 : 30 * 60;
  const retryAfter = error instanceof LlmRateLimitError ? error.retryAfterSeconds : undefined;
  const exponential = Math.min(capSeconds, baseSeconds * 2 ** (cappedAttempt - 1));
  return Math.max(retryAfter ?? 0, exponential);
}

export async function enqueueJob(payload: JobPayload, runAt: Date = new Date()) {
  const [job] = await db
    .insert(schema.jobs)
    .values({
      type: payload.type,
      payload: JSON.stringify(payload),
      runAt,
    })
    .returning({ id: schema.jobs.id });

  if (job?.id) {
    await writeJobLog(job.id, `Queued ${payload.type} job for ${runAt.toISOString()}`);
    logger.info('job_queued', { jobId: job.id, type: payload.type, runAt: runAt.toISOString() });
  }
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
    await writeJobLog(row.id, `Claimed by worker on attempt ${row.attempts}`);
    logger.info('job_claimed', { jobId: row.id, type: payload.type, attempt: row.attempts });

    try {
      if (payload.type === 'scrape') {
        await writeJobLog(row.id, `Starting scrape for source ${payload.sourceId}`);
        logger.info('scrape_started', { jobId: row.id, sourceId: payload.sourceId, attempt: row.attempts });
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
          await writeJobLog(row.id, 'Scrape finished successfully');
          logger.info('scrape_finished', { jobId: row.id, sourceId: payload.sourceId });
        } else if (r.skipped) {
          await db
            .update(schema.sources)
            .set({ lastStatus: 'skipped', lastError: r.reason ?? null })
            .where(eq(schema.sources.id, payload.sourceId));
          await writeJobLog(row.id, `Scrape skipped: ${r.reason ?? 'no reason provided'}`);
          logger.warn('scrape_skipped', { jobId: row.id, sourceId: payload.sourceId, reason: r.reason ?? null });
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
        await writeJobLog(row.id, `Starting score job with limit ${payload.limit ?? 25}`);
        logger.info('score_started', { jobId: row.id, limit: payload.limit ?? 25, attempt: row.attempts });
        const result = await scoreLatestUnscored(payload.limit ?? 25, {
          onArticleScored: async (event) => {
            await writeJobLog(
              row.id,
              `Scored ${event.score}: ${event.title} (${event.model}) - ${event.reason}`,
            );
          },
        });
        await writeJobLog(row.id, `Score job finished successfully; scored ${result.scored} article(s)`);
        logger.info('score_finished', { jobId: row.id, limit: payload.limit ?? 25, scored: result.scored });
      }

      await db
        .update(schema.jobs)
        .set({ status: 'done', lastError: null, updatedAt: sql`now()` })
        .where(eq(schema.jobs.id, row.id));
      await writeJobLog(row.id, 'Marked job done');
      logger.info('job_done', { jobId: row.id, type: payload.type, attempt: row.attempts });
    } catch (e: unknown) {
      const msg = String((e as { message?: string } | null)?.message ?? e);
      const att = Number(row.attempts ?? 1);
      const secs = retryDelaySeconds(att, e);
      await writeJobLog(row.id, `${msg}; retrying in ${secs}s`, 'error');
      logger.error('job_failed_retry_scheduled', {
        jobId: row.id,
        type: payload.type,
        attempt: att,
        retrySeconds: secs,
        error: e,
      });
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
