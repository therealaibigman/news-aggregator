# News Aggregator (MVP)

Personalised news/content aggregator.

- Scrapes configured sources on an interval (scheduler)
- Stores articles in Postgres via Drizzle ORM
- Lets you Like/Dislike articles
- Maintains an **interpretable, reduced-context preference summary** for LLM prompting
- Scores new articles using a **configurable LLM provider/model** (default: OpenRouter)

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

### One-shot refresh (scrape)

```bash
npm run job:refresh
```

### Scheduler (scrape + score loop)

```bash
npm run job:scheduler
```

## Key API routes

- `GET /api/sources`, `POST /api/sources`
- `POST /api/ingest` (add a source by dropping in an article URL, optional like)
- `GET /api/articles?limit=100&offset=0`
- `POST /api/feedback` (like/dislike, optional notes)
- `GET /api/prefs`, `POST /api/prefs` (preference summary)
- `GET /api/settings`, `POST /api/settings` (provider/model selection)

## Notes

- Secrets are **not** stored in DB. API keys stay in `.env`.
- Current scrapers are MVP and will break when sites change. RSS support is a good next step.
