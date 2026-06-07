# trading-api

## 环境

`.env.development` / `.env.pre` / `.env.production`（同 demo-server）

## 本地

```bash
yarn dev
```

## 部署

```bash
yarn deploy:dev
yarn deploy:pre
yarn deploy:prod
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
