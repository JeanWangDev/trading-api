#!/usr/bin/env bash
# Usage: ./scripts/deploy.sh [development|pre|production]

set -euo pipefail

ENV="${1:-}"
APP_NAME="trading-api"
CONFIG_FILE="ecosystem.config.js"

if [ -z "$ENV" ]; then
  echo "Usage: ./scripts/deploy.sh [development|pre|production]"
  exit 1
fi

echo "Deploying ${APP_NAME} [env: ${ENV}]..."

echo "Installing dependencies..."
yarn install --immutable 2>/dev/null || yarn install

echo "Building TypeScript..."
yarn build

if ! command -v pm2 >/dev/null 2>&1; then
  echo "pm2 not found — install globally: npm install -g pm2"
  exit 1
fi

if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
  echo "Reloading existing PM2 process..."
  pm2 reload "$CONFIG_FILE" --env "$ENV"
else
  echo "Starting new PM2 process..."
  pm2 start "$CONFIG_FILE" --env "$ENV"
fi

echo "PM2 status:"
pm2 status "$APP_NAME"
echo "Logs: pm2 logs ${APP_NAME}"
