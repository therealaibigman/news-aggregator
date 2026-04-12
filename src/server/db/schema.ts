import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  boolean,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const sources = pgTable(
  'sources',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    baseUrl: text('base_url').notNull(),
    enabled: boolean('enabled').notNull().default(true),
    refreshMinutes: integer('refresh_minutes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    baseUrlIdx: uniqueIndex('sources_base_url_idx').on(t.baseUrl),
  }),
);

export const articles = pgTable(
  'articles',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    sourceId: uuid('source_id')
      .notNull()
      .references(() => sources.id, { onDelete: 'cascade' }),
    url: text('url').notNull(),
    title: text('title').notNull(),
    summary: text('summary'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    scrapedAt: timestamp('scraped_at', { withTimezone: true }).notNull().defaultNow(),
    embedding: text('embedding'),
    interestScore: integer('interest_score'),
    interestReason: text('interest_reason'),
    interestLabels: text('interest_labels'),
    scoredAt: timestamp('scored_at', { withTimezone: true }),
    scoringModel: text('scoring_model'),
  },
  (t) => ({
    urlIdx: uniqueIndex('articles_url_idx').on(t.url),
  }),
);

export const feedback = pgTable(
  'feedback',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    articleId: uuid('article_id')
      .notNull()
      .references(() => articles.id, { onDelete: 'cascade' }),
    value: integer('value').notNull(), // -1 dislike, +1 like
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
);

export const preferenceSummaries = pgTable('preference_summaries', {
  id: uuid('id').defaultRandom().primaryKey(),
  // MVP: single user, single row (latest wins).
  kind: text('kind').notNull(), // 'global'
  content: text('content').notNull(), // compact LLM-readable summary
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const appSettings = pgTable('app_settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  // MVP: single row
  llmProvider: text('llm_provider').notNull().default('openrouter'),
  llmModel: text('llm_model').notNull().default('openai/gpt-4o-mini'),
  useEnvKey: boolean('use_env_key').notNull().default(true),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
