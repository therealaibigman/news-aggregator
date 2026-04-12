import 'dotenv/config';
import { db } from '../db';
import * as schema from '../db/schema';
import { refreshCointelegraph } from '../jobs/refresh';
import { scoreLatestUnscored } from '../scoring/score';

const DEFAULT_REFRESH_MINUTES = Number(process.env.REFRESH_MINUTES ?? 30);

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
  // For MVP: only cointelegraph.
  await refreshCointelegraph();
  await scoreLatestUnscored(25);
}

async function main() {
  await ensureDefaults();
  console.log(`scheduler: starting (default refresh ${DEFAULT_REFRESH_MINUTES}m)`);

  // MVP scheduler: loop with a single global interval.
  // Next iteration: per-source intervals + last_run tracking.
  while (true) {
    const start = Date.now();
    try {
      await tickOnce();
      console.log(`scheduler: tick ok (${new Date().toISOString()})`);
    } catch (e) {
      console.error('scheduler: tick failed', e);
    }

    const elapsed = Date.now() - start;
    const waitMs = Math.max(DEFAULT_REFRESH_MINUTES * 60_000 - elapsed, 5_000);
    await sleep(waitMs);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
