# trading-api

Trading platform backend for [trading-client](../trading-client).

## 环境文件（demo-server 同款）

| 文件 | 用途 |
|------|------|
| `.env.development` | 本地 `yarn dev` |
| `.env.pre` | 预发 |
| `.env.production` | VPS 生产 `yarn deploy:prod` |

```bash
cp .env.development.example .env.development   # 本地
cp .env.production.example .env.production     # 生产（VPS）
```

数据库统一用 **TiDB Cloud**（`DB_PORT=4000`，`DB_SSL=true`），无本地 MySQL。

## 本地开发

```bash
cp .env.development.example .env.development
yarn install
yarn dev                    # NODE_ENV=development → .env.development
```

## VPS / 本地 PM2（同一命令）

```bash
yarn deploy:prod
```

| 机器 | 有的文件 | 实际读取 |
|------|----------|----------|
| 本地 | `.env.development` | 回退用 development |
| VPS | `.env.production` | 优先 production |

PM2 均为 `NODE_ENV=production`；配置按上表自动选择。

## 数据库初始化

```bash
NODE_ENV=development yarn db:init   # 或 production，读对应 .env.*
```

Health: `GET /health` → `{ data: { db: "up" | "down" | "disabled" } }`

## API

| Method | Path |
|--------|------|
| GET | `/health` |
| GET | `/api/v1/market/*` |
| WS | `/ws/market`, `/ws/events` |

Response: `{ code, success, message, data }`
