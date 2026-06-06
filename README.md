# trading-api

Trading platform backend for [trading-client](../trading-client). Provides unified market data (multi-exchange adapter), dashboard API, and WebSocket streaming.

## Database (MySQL / TiDB + Sequelize, demo-server style)

Uses MySQL-compatible storage (local MySQL or **TiDB Cloud**).

**环境文件（与 demo-server 一致）**

| 文件 | 说明 |
|------|------|
| `.env.development` | 本地开发（gitignore，含密钥） |
| `.env.development.example` | 开发模板 + 中文注释 |
| `.env.pre` | 预发占位配置 |
| `.env.production` | 生产占位配置 |

```bash
cp .env.development.example .env.development
# 编辑 DB_* / JWT_SECRET 等
```

| Variable | Local default | TiDB Cloud |
|----------|---------------|------------|
| `DB_HOST` | `127.0.0.1` | cluster gateway host |
| `DB_PORT` | `3306` | `4000` |
| `DB_SSL` | `false` | `true` |
| `DB_NAME` | `trading-alpha` | `trading-alpha` |

Initialize schema once (`t_role`, `t_user`, …):

```bash
yarn db:init
# local MySQL CLI alternative:
yarn db:init:local
```

Set `DB_ENABLED=false` to run the API without MySQL (market routes only).

Health check includes DB status: `GET /health` → `{ data: { db: "up" | "down" | "disabled" } }`.

## Quick start (local)

```bash
cp .env.development.example .env.development
yarn install
yarn dev                           # tsx hot-reload, port 4000
```

Alternative watch mode (nodemon, demo-server style):

```bash
yarn dev:watch
```

## Build & production run

```bash
yarn build                         # tsc → dist/
yarn start                         # NODE_ENV=production node dist/server.js
```

Health check: `GET http://localhost:4000/health`

## PM2 deploy (demo-server style)

Requires [PM2](https://pm2.keymetrics.io/) installed globally.

```bash
# One-shot: install deps + build + pm2 start/reload
yarn deploy:dev                    # development
yarn deploy:pre                    # pre/staging
yarn deploy:prod                   # production

# Manual PM2
yarn build
pm2 start ecosystem.config.js --env production
pm2 logs trading-api
pm2 stop ecosystem.config.js
```

## Environment files

| File | When loaded |
|------|-------------|
| `.env.development` | `NODE_ENV=development` (default for `yarn dev`) |
| `.env.pre` | `NODE_ENV=pre` |
| `.env.production` | `NODE_ENV=production` |
| `.env` | Fallback overlay (gitignored) |

Templates: `.env.example`, `.env.pre.example`, `.env.production.example`

环境变量说明见 `.env.development.example`（分段中文注释）；`src/config/index.ts` 内对每个字段有 JSDoc，并与 `.env` 变量名对应。pre/production 启动时会校验 `JWT_SECRET` 与数据库必填项。

## API endpoints

| Method | Path | Auth |
|--------|------|------|
| GET | `/health` | public |
| GET | `/api/v1/dashboard/overview` | public (dev) |
| GET | `/api/v1/market/exchanges` | public |
| GET | `/api/v1/market/klines` | public + rate limit |
| GET | `/api/v1/market/symbols` | public + rate limit |
| GET | `/api/v1/market/time` | public |
| GET | `/api/v1/market/symbol-info` | public |
| WS | `/ws/market` | public |

Response envelope (demo-server style — matches trading-client `api-client.ts`):

- **HTTP status** is usually `200` for business APIs (success and failure).
- **Business result** is in the JSON body: `code`, `success`, `message`, `data`.

```json
{ "code": 200, "success": true, "message": "ok", "data": {}, "timestamp": 1234567890 }
```

Errors (e.g. no permission, validation failed):

```json
{ "code": 401, "success": false, "message": "登录状态已失效，请重新登录", "data": null, "timestamp": 1234567890 }
```

The frontend reads `body.code` (not HTTP status) for toasts and 401 logout.

## Project structure

```text
src/
├─ config/          # `.env.{NODE_ENV}` 加载 → config（demo-server 同款）
├─ db/
│  ├─ connection.ts
│  └─ models/auth/  # 按业务域分子目录，index 统一导出
├─ middlewares/     # CORS, response, error, logger, rate-limit, auth
├─ routes/v1/       # thin route registration
├─ controllers/     # auth/ market/ dashboard/ → index 聚合导出
├─ services/        # 同上，业务编排
├─ dto/             # 对外 JSON 形状（与 ORM 字段隔离）
├─ validators/      # auth/ market/ + common/parse，index 聚合导出
├─ exchanges/       # 外部交易所适配（binance，后续 okx…）
├─ utils/           # 通用工具：http-client、kline-cache、jwt…
└─ ws/              # WebSocket hub
```

## Port conflicts

```bash
lsof -i :4000
kill -9 <pid>
```

## vs demo-server — what we adopted / skipped

| demo-server feature | trading-api |
|---------------------|-------------|
| PM2 ecosystem.config.js | ✅ |
| scripts/deploy.sh | ✅ |
| nodemon.json + dev:watch | ✅ |
| tsconfig.build.json | ✅ |
| Multi-env `.env.*` | ✅ |
| zod env validation | —（请求体校验仍用 zod，见 `validators/`） |
| module-alias `@/` paths | ✅ tsconfig paths + `module-alias/register` |
| eslint + prettier | ✅ `yarn lint` / `yarn format` |
