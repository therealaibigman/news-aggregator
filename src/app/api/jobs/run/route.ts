import { runWorkerOnce } from '@/server/jobsq/worker';

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { maxJobs?: number };
  const out = await runWorkerOnce(body.maxJobs ?? 25);
  return Response.json({ ok: true, ...out });
}
