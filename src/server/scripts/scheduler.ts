import 'dotenv/config';
import * as schema from '../db/schema';
import { db } from '../db';
import { runWorkerOnce } from '../jobsq/worker';
import { dispatchDueScrapes } from '../jobsq/dispatcher';

const DEFAULT_REFRESH_MINUTES = Number(process.env.REFRESH_MINUTES ?? 30);
const SCHEDULER_TICK_SECONDS = Math.max(10, Number(process.env.SCHEDULER_TICK_SECONDS ?? 60));
const SCHEDULER_MAX_JOBS = Math.max(1, Number(process.env.SCHEDULER_MAX_JOBS ?? 10));

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
  await dispatchDueScrapes(DEFAULT_REFRESH_MINUTES);

  // Drain a bit of work each tick.
  await runWorkerOnce(SCHEDULER_MAX_JOBS);
}

async function main() {
  await ensureDefaults();
  console.log(
    `scheduler: starting (default refresh ${DEFAULT_REFRESH_MINUTES}m, tick ${SCHEDULER_TICK_SECONDS}s)`,
  );

  // Poll frequently so per-source refreshMinutes and retry runAt values are honoured.
  while (true) {
    const start = Date.now();
    try {
      await tickOnce();
      console.log(`scheduler: tick ok (${new Date().toISOString()})`);
    } catch (e) {
      console.error('scheduler: tick failed', e);
    }

    const elapsed = Date.now() - start;
    const waitMs = Math.max(SCHEDULER_TICK_SECONDS * 1000 - elapsed, 5_000);
    await sleep(waitMs);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
