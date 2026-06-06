# trading-api

Trading platform backend for [trading-client](../trading-client). Market data gateway, auth, templates, events, WebSocket.

## 环境配置

数据库只用 **TiDB Cloud**（无本地 MySQL）。根目录维护一份 **`.env`**（模板见 `.env.example`）：

```bash
cp .env.example .env
# 填写 TiDB Cloud、JWT_SECRET 等
```

| Variable | 说明 |
|----------|------|
| `DB_HOST` / `DB_PORT=4000` / `DB_SSL=true` | TiDB Cloud |
| `CLIENT_ORIGINS` | 生产域名；本地 `localhost:3000` 通过 CORS 正则自动放行 |

旧文件名 `.env.development` 仍可读，建议重命名为 `.env`。

## 本地开发

```bash
cp .env.example .env   # 填 TiDB 连接信息
yarn install
yarn dev               # http://localhost:4000
```

前端（trading-client）：

```bash
cp .env.example .env.local
yarn dev               # http://localhost:3000，代理到 localhost:4000
```

初始化表结构（只需一次）：

```bash
yarn db:init
```

Health check: `GET /health` → `{ data: { db: "up" | "down" | "disabled" } }`

## VPS 部署

```bash
yarn build
yarn start        # 或 PM2
```

```bash
yarn deploy       # install + build + pm2 reload
yarn check:deploy # 自检
pm2 logs trading-api
```

域名：`api.aipassly.com` → Nginx → `127.0.0.1:4000`

## API endpoints

| Method | Path | Auth |
|--------|------|------|
| GET | `/health` | public |
| GET | `/api/v1/market/*` | public + rate limit |
| GET | `/api/v1/auth/*` | mixed |
| WS | `/ws/market` | public |
| WS | `/ws/events` | public |

Response envelope: `{ code, success, message, data }`

## Project structure

```text
src/
├─ config/       # .env → config
├─ db/           # Sequelize + TiDB
├─ services/     # business logic
├─ routes/v1/    # HTTP routes
└─ ws/           # WebSocket hubs
```
