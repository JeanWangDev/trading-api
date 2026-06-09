# trading-api

## 环境

| 场景 | `NODE_ENV` | 配置文件 | 端口 |
|------|------------|----------|------|
| 本地开发 | `development` | `.env.development` | 4000 |
| 测试服 | `development` | `.env.development`（服务器上 PORT=4001） | 4001 |
| 生产 | `production` | `.env.production` | 4000 |

本地与测试服共用 `.env.development`，靠 `PORT` 和服务器上的变量区分（如 `DB_NAME=trading-alpha-test`、`CLIENT_ORIGINS`）。

## 本地

```bash
yarn dev          # localhost:4000
yarn dev:test     # localhost:4001（模拟测试服端口）
```

## 部署

```bash
yarn deploy:test  # api-test.aipassly.com → 4001
yarn deploy:prod  # api.aipassly.com → 4000
```

## 数据库

```bash
yarn db:init
yarn ingest:news      # 手动采一次快讯
```

## 定时采集（快讯 RSS）

PM2 进程 **trading-ingest** = `scripts/ingest-loop.ts`，循环执行 `ingest:news`。

```bash
# .env.production 自定义间隔（毫秒），默认 900000（15 分钟），例：5 分钟
INGEST_INTERVAL_MS=300000

yarn deploy:prod       # 重启 trading-ingest
pm2 logs trading-ingest
```

**与 /trade 实时 K 线无关** — K 线走 `trading-api` 的 `/ws/market` → Binance。

国内 VPS 请用 `wss://data-stream.binance.vision`（与 `data-api.binance.vision` 配套），勿用 `stream.binance.com`。

会员支付详见 [docs/BILLING.md](./docs/BILLING.md)。
