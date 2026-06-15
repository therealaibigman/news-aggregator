import { db } from '@/server/db';
import * as schema from '@/server/db/schema';
import { asc, desc, eq, sql } from 'drizzle-orm';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 50), 200);
  const offset = Math.max(Number(url.searchParams.get('offset') ?? 0), 0);
  const oldestFirst = url.searchParams.get('order') === 'oldest';
  const articleTime = sql`coalesce(${schema.articles.publishedAt}, ${schema.articles.scrapedAt})`;

  const rows = await db
    .select({
      id: schema.articles.id,
      url: schema.articles.url,
      title: schema.articles.title,
      summary: schema.articles.summary,
      publishedAt: schema.articles.publishedAt,
      scrapedAt: schema.articles.scrapedAt,
      sourceId: schema.articles.sourceId,
      sourceName: schema.sources.name,
      baseUrl: schema.sources.baseUrl,
      likes: sql<number>`coalesce(sum(case when ${schema.feedback.value} = 1 then 1 else 0 end), 0)`
        .mapWith(Number)
        .as('likes'),
      dislikes: sql<number>`coalesce(sum(case when ${schema.feedback.value} = -1 then 1 else 0 end), 0)`
        .mapWith(Number)
        .as('dislikes'),
    })
    .from(schema.articles)
    .innerJoin(schema.sources, eq(schema.articles.sourceId, schema.sources.id))
    .leftJoin(schema.feedback, eq(schema.feedback.articleId, schema.articles.id))
    .groupBy(schema.articles.id, schema.sources.id)
    .orderBy(oldestFirst ? asc(articleTime) : desc(articleTime), desc(schema.articles.scrapedAt))
    .limit(limit)
    .offset(offset);

  return Response.json(rows);
}
