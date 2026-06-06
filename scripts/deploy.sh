#!/bin/sh
# 用法: ./scripts/deploy.sh [development|pre|production]

ENV=$1
APP_NAME="trading-api"
CONFIG_FILE="ecosystem.config.js"

if [ -z "$ENV" ]; then
  echo "请传入部署环境: development / pre / production"
  exit 1
fi

echo "开始部署 [环境: $ENV]..."

yarn install
yarn build

if pm2 describe "$APP_NAME" > /dev/null 2>&1; then
  pm2 reload "$CONFIG_FILE" --env "$ENV"
else
  pm2 start "$CONFIG_FILE" --env "$ENV"
fi

pm2 status
echo "日志: pm2 logs $APP_NAME"
