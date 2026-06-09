#!/bin/sh
# 用法: ./scripts/deploy.sh [test|production]
# 同机可并存：production → 4000，test(development) → 4001
# 测试服与本地共用 .env.development；生产用 .env.production

ENV=$1
CONFIG_FILE="ecosystem.config.js"

if [ -z "$ENV" ]; then
  echo "请传入部署环境: test / production"
  exit 1
fi

case "$ENV" in
  production|prod)
    APPS="trading-api trading-ingest trading-strategy-watch trading-payment-watch"
    ;;
  test|pre|development)
    APPS="trading-api-test trading-ingest-test trading-strategy-watch-test trading-payment-watch-test"
    ;;
  *)
    echo "不支持的环境: $ENV（请用 test 或 production）"
    exit 1
    ;;
esac

echo "开始部署 [环境: $ENV]..."
echo "进程: $APPS"

yarn install
yarn build

for app in $APPS; do
  if pm2 describe "$app" > /dev/null 2>&1; then
    pm2 reload "$app" --update-env
  else
    pm2 start "$CONFIG_FILE" --only "$app"
  fi
done

pm2 save
pm2 status
echo ""
echo "生产 API: pm2 logs trading-api           (port 4000, .env.production)"
echo "测试 API: pm2 logs trading-api-test       (port 4001, .env.development)"
echo ""
echo "若仍有旧进程 trading-api-pre 等，可执行: pm2 delete trading-api-pre trading-ingest-pre trading-strategy-watch-pre trading-payment-watch-pre"
