import { db } from '../db';
import * as schema from '../db/schema';
import { scrapeSource } from '../scrapers';
import { eq } from 'drizzle-orm';

export async function refreshCointelegraph() {
  const source = await db
    .select()
    .from(schema.sources)
    .where(eq(schema.sources.baseUrl, 'https://cointelegraph.com'))
    .limit(1);

  const sourceId = source[0]?.id;
  if (!sourceId) return;

  const items = await scrapeSource('cointelegraph');

  for (const item of items) {
    await db
      .insert(schema.articles)
      .values({
        sourceId,
        url: item.url,
        title: item.title,
        summary: item.summary,
        publishedAt: item.publishedAt,
      })
      .onConflictDoNothing();
  }
}
