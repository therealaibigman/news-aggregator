import { db } from '../db';
import * as schema from '../db/schema';
import { desc, eq, sql } from 'drizzle-orm';

function tokenize(text: string) {
  return text
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 3 && t.length <= 30);
}

const STOP = new Set([
  'the',
  'and',
  'for',
  'with',
  'from',
  'that',
  'this',
  'into',
  'are',
  'was',
  'were',
  'will',
  'has',
  'have',
  'had',
  'but',
  'you',
  'your',
  'their',
  'they',
  'about',
  'over',
  'under',
  'after',
  'before',
  'what',
  'when',
  'where',
  'why',
  'how',
  'new',
  'news',
  'crypto',
  'bitcoin',
]);

export async function buildGlobalPreferenceSummary() {
  const rows = await db
    .select({
      title: schema.articles.title,
      url: schema.articles.url,
      value: schema.feedback.value,
      notes: schema.feedback.notes,
      createdAt: schema.feedback.createdAt,
    })
    .from(schema.feedback)
    .innerJoin(schema.articles, eq(schema.feedback.articleId, schema.articles.id))
    .orderBy(desc(schema.feedback.createdAt))
    .limit(400);

  const likes: string[] = [];
  const dislikes: string[] = [];

  const likeTerms = new Map<string, number>();
  const dislikeTerms = new Map<string, number>();

  for (const r of rows) {
    const text = `${r.title} ${r.notes ?? ''}`.trim();
    const tokens = tokenize(text).filter((t) => !STOP.has(t));

    const m = r.value === 1 ? likeTerms : dislikeTerms;
    for (const t of tokens) m.set(t, (m.get(t) ?? 0) + 1);

    const item = `- ${r.title} (${r.url})${r.notes ? `\n  note: ${r.notes}` : ''}`;
    if (r.value === 1) likes.push(item);
    else dislikes.push(item);
  }

  const top = (m: Map<string, number>) =>
    [...m.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([t, c]) => `${t}(${c})`);

  const content = [
    'USER_PREFERENCES v1 (interpretable, compact)',
    '',
    `Signals: likes=${likes.length}, dislikes=${dislikes.length}`,
    '',
    'TOP_LIKED_TERMS:',
    top(likeTerms).join(', ') || '(none)',
    '',
    'TOP_DISLIKED_TERMS:',
    top(dislikeTerms).join(', ') || '(none)',
    '',
    'RECENT_LIKES:',
    likes.slice(0, 15).join('\n') || '(none)',
    '',
    'RECENT_DISLIKES:',
    dislikes.slice(0, 15).join('\n') || '(none)',
  ].join('\n');

  // Upsert latest global summary.
  const existing = await db
    .select({ id: schema.preferenceSummaries.id })
    .from(schema.preferenceSummaries)
    .where(eq(schema.preferenceSummaries.kind, 'global'))
    .limit(1);

  if (existing[0]?.id) {
    await db
      .update(schema.preferenceSummaries)
      .set({
        content,
        updatedAt: sql`now()`,
      })
      .where(eq(schema.preferenceSummaries.id, existing[0].id));
  } else {
    await db.insert(schema.preferenceSummaries).values({ kind: 'global', content });
  }

  return content;
}
