# News Aggregator (MVP)

Personalised news/content aggregator.

- Scrapes configured sources on an interval (scheduler)
- Stores articles in Postgres via Drizzle ORM
- Lets you Like/Dislike articles
- Maintains an **interpretable, reduced-context preference summary** for LLM prompting
- Scores new articles using a **configurable LLM provider/model** (default: OpenRouter)
- Auto-add sources with **RSS autodetect**, otherwise **LLM-generated scraping recipes** you can test/approve

## Tech

- Next.js (App Router, TS)
- Node.js
- Postgres
- Drizzle ORM

## Setup

### 1) Install

```bash
npm install
```

### 2) Postgres

Set a database URL in `.env`.

```bash
cp .env.example .env
```

Create the database, then run migrations:

```bash
npm run db:generate
npm run db:migrate
```

### 3) LLM scoring (optional, but recommended)

Add your key + model in `.env`:

- `LLM_PROVIDER=openrouter`
- `LLM_API_KEY=...`
- `LLM_MODEL=openai/gpt-4o-mini` (or any model id supported by your provider)

## Running

### Web app (port 3001)

```bash
npm run dev
```

Open:
- http://localhost:3001
- Settings: http://localhost:3001/settings
- Sources: http://localhost:3001/settings/sources
- Jobs: http://localhost:3001/settings/jobs
- Articles: http://localhost:3001/articles

### One-shot refresh (scrape)

```bash
npm run job:refresh
```

### Dispatcher + worker

```bash
npm run job:dispatch
npm run job:worker
```

Worker concurrency is controlled by `WORKER_CONCURRENCY` (default 2).

### Scheduler

```bash
npm run job:scheduler
```

The scheduler polls for due sources every `SCHEDULER_TICK_SECONDS` (default 60) and uses `REFRESH_MINUTES` (default 30) for sources without their own refresh interval. It also drains up to `SCHEDULER_MAX_JOBS` jobs each tick.

### Production with PM2

```bash
PM2_APP_NAME=news-aggregator PORT=3001 pm2 start ecosystem.config.cjs --update-env
pm2 save
```

The ecosystem starts three processes:

- `news-aggregator` - Next.js web app
- `news-aggregator-scheduler` - dispatches due source refreshes on the auto-refresh schedule
- `news-aggregator-worker` - drains queued scrape and score jobs continuously

PM2 logs use JSON lines for scheduler, worker, job, and LLM events:

```bash
pm2 logs news-aggregator-worker --lines 200 --raw
pm2 logs news-aggregator-scheduler --lines 200 --raw
pm2 logs news-aggregator --lines 200 --raw
```

Useful filters:

```bash
pm2 logs news-aggregator-worker --lines 500 --raw | jq -r 'select(.level=="error" or .level=="warn")'
pm2 logs news-aggregator-worker --lines 500 --raw | jq -r 'select(.component=="llm.client")'
```

For scoring, use a text/chat model that reliably returns JSON. If the configured model is flaky, set
`SCORING_FALLBACK_MODEL` in `.env`; score jobs will try it after the primary model fails.

## Key API routes

- `GET /api/sources`, `POST /api/sources`
- `POST /api/sources/auto` (RSS autodetect, else generate LLM recipe)
- `POST /api/ingest` (add a source by dropping in an article URL, optional like)
- `GET /api/articles/list?unread=1&saved=1&limit=100`
- `POST /api/articles/read` / `hide` / `save`
- `POST /api/feedback` (like/dislike, optional notes)
- `GET /api/prefs`, `POST /api/prefs` (preference summary)
- `GET /api/settings`, `POST /api/settings` (provider/model selection)
- Jobs: `GET /api/jobs/list`, `POST /api/jobs/dispatch`, `POST /api/jobs/run`, `POST /api/jobs/enqueue`
- Recipes: `POST /api/recipes/test`, `POST /api/recipes/approve-safe`

## Notes

- Secrets are **not** stored in DB. API keys stay in `.env`.
- Current scrapers are MVP and will break when sites change. Prefer RSS or approved recipes.
