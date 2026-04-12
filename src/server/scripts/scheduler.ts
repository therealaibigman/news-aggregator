import 'dotenv/config';
import { db } from '../db';
import * as schema from '../db/schema';
import { refreshSourceById } from '../jobs/refresh';
import { scoreLatestUnscored } from '../scoring/score';
import { eq, sql } from 'drizzle-orm';

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
  // Refresh any enabled sources that are due.
  const now = new Date();
  const due = await db
    .select({
      id: schema.sources.id,
      refreshMinutes: schema.sources.refreshMinutes,
      lastRunAt: schema.sources.lastRunAt,
    })
    .from(schema.sources)
    .where(eq(schema.sources.enabled, true));

  for (const s of due) {
    const minutes = s.refreshMinutes ?? DEFAULT_REFRESH_MINUTES;
    const dueAt = s.lastRunAt ? new Date(s.lastRunAt.getTime() + minutes * 60_000) : null;
    const isDue = !dueAt || dueAt <= now;
    if (!isDue) continue;

    const res = await refreshSourceById(s.id);
    if (res.ok) {
      await db
        .update(schema.sources)
        .set({ lastRunAt: sql`now()`, lastStatus: 'ok', lastError: null })
        .where(eq(schema.sources.id, s.id));
    } else if (res.skipped) {
      await db
        .update(schema.sources)
        .set({ lastRunAt: sql`now()`, lastStatus: 'skipped', lastError: res.reason ?? null })
        .where(eq(schema.sources.id, s.id));
    } else {
      await db
        .update(schema.sources)
        .set({ lastRunAt: sql`now()`, lastStatus: 'error', lastError: res.error ?? 'unknown' })
        .where(eq(schema.sources.id, s.id));
    }
  }

  // Score a batch after refresh.
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
