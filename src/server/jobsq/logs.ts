import { sql } from 'drizzle-orm';
import { db } from '../db';

let ensurePromise: Promise<void> | null = null;

export function ensureJobLogsTable() {
  ensurePromise ??= (async () => {
    await db.execute(sql`
      create table if not exists job_logs (
        id uuid primary key default gen_random_uuid() not null,
        job_id uuid not null references jobs(id) on delete cascade,
        level text not null default 'info',
        message text not null,
        created_at timestamp with time zone not null default now()
      );
    `);
    await db.execute(sql`create index if not exists job_logs_job_id_idx on job_logs(job_id);`);
  })();

  return ensurePromise;
}
