import { db } from '@/server/db';
import * as schema from '@/server/db/schema';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 50), 200);
  const offset = Math.max(Number(url.searchParams.get('offset') ?? 0), 0);
  const onlyUnread = url.searchParams.get('unread') === '1';
  const onlySaved = url.searchParams.get('saved') === '1';
  const hideHidden = url.searchParams.get('hideHidden') !== '0';

  const where = and(
    hideHidden ? eq(schema.articlesHidden.hidden, false) : undefined,
    onlyUnread ? isNull(schema.articlesRead.readAt) : undefined,
    onlySaved ? eq(schema.articlesSaved.saved, true) : undefined,
  );

  const rows = await db
    .select({
      id: schema.articles.id,
      url: schema.articles.url,
      title: schema.articles.title,
      summary: schema.articles.summary,
      scrapedAt: schema.articles.scrapedAt,
      interestScore: schema.articles.interestScore,
      interestReason: schema.articles.interestReason,
      interestLabels: schema.articles.interestLabels,
      sourceName: schema.sources.name,
      baseUrl: schema.sources.baseUrl,
      readAt: schema.articlesRead.readAt,
      hidden: schema.articlesHidden.hidden,
      saved: schema.articlesSaved.saved,
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
    .leftJoin(schema.articlesRead, eq(schema.articlesRead.articleId, schema.articles.id))
    .leftJoin(schema.articlesHidden, eq(schema.articlesHidden.articleId, schema.articles.id))
    .leftJoin(schema.articlesSaved, eq(schema.articlesSaved.articleId, schema.articles.id))
    .where(where)
    .groupBy(schema.articles.id, schema.sources.id, schema.articlesRead.readAt, schema.articlesHidden.hidden, schema.articlesSaved.saved)
    .orderBy(desc(schema.articles.scrapedAt))
    .limit(limit)
    .offset(offset);

  return Response.json(rows);
}
