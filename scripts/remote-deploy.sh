#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-$(pwd)}"
PM2_APP_NAME="${PM2_APP_NAME:-news-aggregator}"
PORT="${PORT:-3001}"
NVM_DIR="${NVM_DIR:-$HOME/.nvm}"

cd "$APP_DIR"

if [ ! -f ".env" ]; then
  echo "Missing .env in $APP_DIR; refusing to deploy without runtime configuration." >&2
  exit 1
fi

if [ -s "$NVM_DIR/nvm.sh" ]; then
  # Non-interactive SSH sessions do not load nvm automatically.
  . "$NVM_DIR/nvm.sh"
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is not installed or not on PATH for $(whoami)." >&2
  exit 1
fi

npm ci

if [ -d drizzle ] && find drizzle -maxdepth 1 -type f -name '*.sql' -print -quit 2>/dev/null | grep -q .; then
  npm run db:migrate
else
  echo "No drizzle SQL migrations found; skipping database migration."
fi

npm run build

if ! command -v pm2 >/dev/null 2>&1; then
  echo "pm2 is not installed or not on PATH for $(whoami)." >&2
  exit 1
fi

pm2 delete "$PM2_APP_NAME" "$PM2_APP_NAME-scheduler" "$PM2_APP_NAME-worker" >/dev/null 2>&1 || true
PM2_APP_NAME="$PM2_APP_NAME" PORT="$PORT" pm2 start ecosystem.config.cjs --update-env
pm2 save
pm2 status "$PM2_APP_NAME"
pm2 status "$PM2_APP_NAME-scheduler"
pm2 status "$PM2_APP_NAME-worker"
