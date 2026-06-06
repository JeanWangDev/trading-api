#!/usr/bin/env bash
# Usage: ./scripts/deploy.sh  或  yarn deploy

set -euo pipefail

APP_NAME="trading-api"
CONFIG_FILE="ecosystem.config.js"

echo "Deploying ${APP_NAME}..."

if [[ ! -f .env ]] && [[ ! -f .env.development ]]; then
  echo "Error: 缺少 .env — 请 cp .env.example .env 并填写 TiDB / JWT"
  exit 1
fi

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
  pm2 reload "$CONFIG_FILE"
else
  echo "Starting new PM2 process..."
  pm2 start "$CONFIG_FILE"
fi

echo "PM2 status:"
pm2 status
echo "Logs: pm2 logs ${APP_NAME}"
