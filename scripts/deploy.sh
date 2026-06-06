#!/usr/bin/env bash
# Usage: ./scripts/deploy.sh [development|pre|production]
#   yarn deploy:dev   → development
#   yarn deploy:pre   → pre
#   yarn deploy:prod  → production

set -euo pipefail

ENV="${1:-}"
APP_NAME="trading-api"
CONFIG_FILE="ecosystem.config.js"

if [[ -z "$ENV" ]]; then
  echo "Error: 请传入部署环境: development | pre | production"
  echo "  例: bash scripts/deploy.sh production"
  exit 1
fi

case "$ENV" in
  development|pre|production) ;;
  *)
    echo "Error: 无效环境 '$ENV'，应为 development | pre | production"
    exit 1
    ;;
esac

# production：优先 .env.production，本地可回退 .env.development
if [[ "$ENV" == "production" ]]; then
  if [[ -f .env.production ]]; then
    ENV_FILE=".env.production"
  elif [[ -f .env.development ]]; then
    ENV_FILE=".env.development"
    echo "Note: 未找到 .env.production，使用 .env.development"
  else
    echo "Error: 缺少 .env.production 或 .env.development"
    echo "  请 cp .env.production.example .env.production 并填写"
    exit 1
  fi
else
  ENV_FILE=".env.${ENV}"
  if [[ ! -f "$ENV_FILE" ]]; then
    echo "Error: 缺少 ${ENV_FILE}"
    echo "  请 cp .env.${ENV}.example ${ENV_FILE} 并填写"
    exit 1
  fi
fi

echo "Deploying ${APP_NAME} [${ENV}] (config: ${ENV_FILE})..."

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
pm2 status
echo "Logs: pm2 logs ${APP_NAME}"
