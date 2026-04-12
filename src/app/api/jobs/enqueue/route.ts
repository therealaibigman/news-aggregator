import { enqueueJob } from '@/server/jobsq/worker';

export async function POST(req: Request) {
  const body = (await req.json()) as { type: 'scrape' | 'score'; sourceId?: string; limit?: number };

  if (body.type === 'scrape') {
    if (!body.sourceId) return Response.json({ ok: false, error: 'sourceId required' }, { status: 400 });
    await enqueueJob({ type: 'scrape', sourceId: body.sourceId });
    return Response.json({ ok: true });
  }

  await enqueueJob({ type: 'score', limit: body.limit ?? 25 });
  return Response.json({ ok: true });
}
