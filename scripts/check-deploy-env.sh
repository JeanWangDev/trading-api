#!/usr/bin/env bash
# 部署前自检：bash scripts/check-deploy-env.sh [development|pre|production]

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ENV="${1:-production}"
ENV_FILE=".env.${ENV}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ok() { echo -e "${GREEN}✓${NC} $1"; }
warn() { echo -e "${YELLOW}!${NC} $1"; }
fail() { echo -e "${RED}✗${NC} $1"; }

echo "=== trading-api 部署自检 [${ENV}] ==="
echo "目录: $ROOT"
echo

if [[ ! -f "$ENV_FILE" ]]; then
  fail "缺少 ${ENV_FILE}（请 cp .env.${ENV}.example ${ENV_FILE}）"
else
  ok "${ENV_FILE} 存在"
  for key in DB_HOST DB_PORT DB_USER DB_PASSWORD DB_NAME DB_SSL JWT_SECRET CLIENT_ORIGINS; do
    if grep -qE "^${key}=" "$ENV_FILE" 2>/dev/null; then
      ok "  ${key} 已配置"
    else
      warn "  ${key} 未找到"
    fi
  done
fi

echo

if [[ -f dist/server.js ]]; then
  ok "dist/server.js 已 build"
else
  fail "未 build — 请 yarn build"
fi

echo

if command -v pm2 >/dev/null 2>&1; then
  ok "pm2 已安装"
  pm2 describe trading-api >/dev/null 2>&1 && pm2 status trading-api || warn "trading-api 未运行"
else
  warn "pm2 未安装"
fi

echo

if curl -sf --max-time 3 http://127.0.0.1:4000/health >/dev/null 2>&1; then
  ok "http://127.0.0.1:4000/health 正常"
  curl -s http://127.0.0.1:4000/health | head -c 200
  echo
else
  fail "4000 端口无响应 — pm2 logs trading-api"
fi

echo
echo "=== 完成 ==="
