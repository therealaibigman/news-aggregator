import { db } from '../db';
import * as schema from '../db/schema';
import { desc, eq, isNull, sql } from 'drizzle-orm';
import { llmJson } from '../llm/client';
import type { LlmProvider } from '../llm/client';
import { z } from 'zod';

type ScoreOut = {
  score: number; // 0-100
  reason: string; // short
  labels: string[]; // short tags
};

const scoreSchema = z.object({
  score: z.coerce.number().min(0).max(100).default(50),
  reason: z.coerce.string().max(500).default(''),
  labels: z.array(z.coerce.string().max(40)).max(6).default([]),
});

async function getSettings() {
  const row = await db.select().from(schema.appSettings).limit(1);
  if (row[0]) return row[0];
  const [created] = await db.insert(schema.appSettings).values({}).returning();
  return created;
}

async function getPrefs() {
  const row = await db
    .select({ content: schema.preferenceSummaries.content })
    .from(schema.preferenceSummaries)
    .where(eq(schema.preferenceSummaries.kind, 'global'))
    .limit(1);
  return row[0]?.content ?? '';
}

export async function scoreLatestUnscored(limit = 25) {
  const settings = await getSettings();
  const prefs = await getPrefs();

  const rows = await db
    .select({
      id: schema.articles.id,
      title: schema.articles.title,
      summary: schema.articles.summary,
      url: schema.articles.url,
    })
    .from(schema.articles)
    .where(isNull(schema.articles.scoredAt))
    .orderBy(desc(schema.articles.scrapedAt))
    .limit(limit);

  for (const a of rows) {
    const prompt = [
      'Schema:',
      '{"score": number(0-100), "reason": string(<=160 chars), "labels": string[](<=6 items, <=20 chars each)}',
      '',
      'User preferences (compact):',
      prefs || '(none yet)',
      '',
      'Article:',
      `title: ${a.title}`,
      a.summary ? `summary: ${a.summary}` : '',
      `url: ${a.url}`,
      '',
      'Task: Decide how interested the user will be. Be consistent with dislikes. If unsure, score ~50.',
      'Return exactly one JSON object with keys: score, reason, labels.',
    ]
      .filter(Boolean)
      .join('\n');

    const out = await llmJson<ScoreOut>(
      {
        provider: (settings.llmProvider as LlmProvider) ?? 'openrouter',
        model: settings.llmModel,
        apiKey: settings.useEnvKey ? process.env.LLM_API_KEY : process.env.LLM_API_KEY,
      },
      prompt,
      (value) => scoreSchema.parse(value) as ScoreOut,
    );

    const score = Math.max(0, Math.min(100, Math.round(out.score ?? 50)));
    const reason = String(out.reason ?? '').slice(0, 500);
    const labels = JSON.stringify((out.labels ?? []).slice(0, 6));

    await db
      .update(schema.articles)
      .set({
        interestScore: score,
        interestReason: reason,
        interestLabels: labels,
        scoredAt: sql`now()`,
        scoringModel: settings.llmModel,
      })
      .where(eq(schema.articles.id, a.id));
  }

  return { scored: rows.length };
}
