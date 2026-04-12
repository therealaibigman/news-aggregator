import { db } from '../db';
import * as schema from '../db/schema';
import { eq, sql } from 'drizzle-orm';
import { enqueueJob } from './worker';

export async function dispatchDueScrapes(defaultRefreshMinutes: number) {
  const now = new Date();
  const sources = await db
    .select({
      id: schema.sources.id,
      refreshMinutes: schema.sources.refreshMinutes,
      lastRunAt: schema.sources.lastRunAt,
      nextRunAt: schema.sources.nextRunAt,
    })
    .from(schema.sources)
    .where(eq(schema.sources.enabled, true));

  let enqueued = 0;

  for (const s of sources) {
    const minutes = s.refreshMinutes ?? defaultRefreshMinutes;
    const dueAt = s.nextRunAt
      ? new Date(s.nextRunAt)
      : s.lastRunAt
        ? new Date(s.lastRunAt.getTime() + minutes * 60_000)
        : null;
    const isDue = !dueAt || dueAt <= now;
    if (!isDue) continue;

    await enqueueJob({ type: 'scrape', sourceId: s.id });
    await db
      .update(schema.sources)
      .set({ lastRunAt: sql`now()`, lastStatus: 'queued', lastError: null })
      .where(eq(schema.sources.id, s.id));

    enqueued++;
  }

  // score job: cheap to enqueue, worker will do limited batch
  await enqueueJob({ type: 'score', limit: 25 });

  return { enqueued };
}
