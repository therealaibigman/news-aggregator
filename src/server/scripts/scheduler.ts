import 'dotenv/config';
import * as schema from '../db/schema';
import { db } from '../db';
import { runWorkerOnce } from '../jobsq/worker';
import { dispatchDueScrapes } from '../jobsq/dispatcher';
import { createLogger } from '../logging/logger';

const DEFAULT_REFRESH_MINUTES = Number(process.env.REFRESH_MINUTES ?? 30);
const SCHEDULER_TICK_SECONDS = Math.max(10, Number(process.env.SCHEDULER_TICK_SECONDS ?? 60));
const SCHEDULER_DRAIN_JOBS = process.env.SCHEDULER_DRAIN_JOBS === 'true';
const SCHEDULER_MAX_JOBS = Math.max(1, Number(process.env.SCHEDULER_MAX_JOBS ?? 1));
const logger = createLogger('scripts.scheduler');

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function ensureDefaults() {
  await db
    .insert(schema.sources)
    .values({ name: 'Cointelegraph', baseUrl: 'https://cointelegraph.com', enabled: true })
    .onConflictDoNothing();
}

async function tickOnce() {
  const dispatched = await dispatchDueScrapes(DEFAULT_REFRESH_MINUTES);

  const worker = SCHEDULER_DRAIN_JOBS ? await runWorkerOnce(SCHEDULER_MAX_JOBS) : { processed: 0 };
  return { ...dispatched, processed: worker.processed };
}

async function main() {
  await ensureDefaults();
  logger.info('scheduler_started', {
    defaultRefreshMinutes: DEFAULT_REFRESH_MINUTES,
    tickSeconds: SCHEDULER_TICK_SECONDS,
    drainJobs: SCHEDULER_DRAIN_JOBS,
    maxJobs: SCHEDULER_MAX_JOBS,
  });

  // Poll frequently so per-source refreshMinutes and retry runAt values are honoured.
  while (true) {
    const start = Date.now();
    try {
      const result = await tickOnce();
      logger.info('scheduler_tick_ok', { elapsedMs: Date.now() - start, ...result });
    } catch (e) {
      logger.error('scheduler_tick_failed', { elapsedMs: Date.now() - start, error: e });
    }

    const elapsed = Date.now() - start;
    const waitMs = Math.max(SCHEDULER_TICK_SECONDS * 1000 - elapsed, 5_000);
    await sleep(waitMs);
  }
}

main().catch((err) => {
  logger.error('scheduler_fatal', { error: err });
  process.exit(1);
});
