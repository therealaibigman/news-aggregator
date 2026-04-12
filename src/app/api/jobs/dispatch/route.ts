import { dispatchDueScrapes } from '@/server/jobsq/dispatcher';

export async function POST() {
  const minutes = Number(process.env.REFRESH_MINUTES ?? 30);
  const out = await dispatchDueScrapes(minutes);
  return Response.json({ ok: true, ...out });
}
