import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  boolean,
  index,
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
    lastRunAt: timestamp('last_run_at', { withTimezone: true }),
    lastStatus: text('last_status'),
    lastError: text('last_error'),
    failCount: integer('fail_count').notNull().default(0),
    nextRunAt: timestamp('next_run_at', { withTimezone: true }),
    scoringEnabled: boolean('scoring_enabled').notNull().default(true),
    scoringOverride: boolean('scoring_override').notNull().default(false),
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

export const articlesRead = pgTable(
  'articles_read',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    articleId: uuid('article_id')
      .notNull()
      .references(() => articles.id, { onDelete: 'cascade' }),
    readAt: timestamp('read_at', { withTimezone: true }),
  },
  (t) => ({
    articleIdIdx: uniqueIndex('articles_read_article_id_idx').on(t.articleId),
  }),
);

export const articlesHidden = pgTable(
  'articles_hidden',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    articleId: uuid('article_id')
      .notNull()
      .references(() => articles.id, { onDelete: 'cascade' }),
    hidden: boolean('hidden').notNull().default(false),
  },
  (t) => ({
    articleIdIdx: uniqueIndex('articles_hidden_article_id_idx').on(t.articleId),
  }),
);

export const articlesSaved = pgTable(
  'articles_saved',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    articleId: uuid('article_id')
      .notNull()
      .references(() => articles.id, { onDelete: 'cascade' }),
    saved: boolean('saved').notNull().default(false),
  },
  (t) => ({
    articleIdIdx: uniqueIndex('articles_saved_article_id_idx').on(t.articleId),
  }),
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
  scraperLlmModel: text('scraper_llm_model').notNull().default('openai/gpt-4o-mini'),
  scoringDefaultEnabled: boolean('scoring_default_enabled').notNull().default(true),
  useEnvKey: boolean('use_env_key').notNull().default(true),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const jobs = pgTable('jobs', {
  id: uuid('id').defaultRandom().primaryKey(),
  type: text('type').notNull(), // scrape | score
  status: text('status').notNull().default('queued'), // queued | running | done | error
  payload: text('payload').notNull(), // JSON
  runAt: timestamp('run_at', { withTimezone: true }).notNull().defaultNow(),
  attempts: integer('attempts').notNull().default(0),
  lastError: text('last_error'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const jobLogs = pgTable(
  'job_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    jobId: uuid('job_id')
      .notNull()
      .references(() => jobs.id, { onDelete: 'cascade' }),
    level: text('level').notNull().default('info'), // info | error
    message: text('message').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    jobIdIdx: index('job_logs_job_id_idx').on(t.jobId),
  }),
);

export const sourceRecipes = pgTable(
  'source_recipes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    sourceId: uuid('source_id')
      .notNull()
      .references(() => sources.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull(), // rss | recipe | code
    host: text('host').notNull(),
    // JSON text for recipe, or TS code for fallback.
    content: text('content').notNull(),
    approved: boolean('approved').notNull().default(false),
    lastTestedAt: timestamp('last_tested_at', { withTimezone: true }),
    lastTestStatus: text('last_test_status'),
    lastTestError: text('last_test_error'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    sourceIdIdx: uniqueIndex('source_recipes_source_id_idx').on(t.sourceId),
  }),
);
