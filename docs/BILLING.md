# Billing / Membership

## 架构

```
trading-api
├── services/billing/     套餐、订单、订阅、角色升级
├── billing/tron-*.ts     HD 地址派生 + TronGrid 监听
└── scripts/payment-watch.ts   PM2: trading-payment-watch

trading-client
└── /vip                  套餐展示 + 下单 + 转账指引
```

## 数据库

会员相关表在 TiDB 里维护（`t_membership_plan`、`t_payment_order`、`t_user_subscription`、`t_payment_address_index`）。  
建表 DDL 仅作参考：`scripts/sql/billing.sql`（**不要**通过 yarn script 自动执行）。

## 本地开发

`.env.development`：

```bash
BILLING_DEV_AUTO_CONFIRM=true   # 3 秒后自动确认，无需真转账
```

## 生产必填

```bash
BILLING_DEV_AUTO_CONFIRM=false
TRON_DEPOSIT_XPUB=...             # 推荐：账户级 xpub (m/44'/195'/0')
TRONGRID_API_KEY=...              # 可选但建议
```

## PM2

| 进程 | 作用 |
|------|------|
| trading-api | REST + WS |
| trading-payment-watch | 扫链确认 + 订阅到期降级 |
| trading-ingest | RSS（与支付无关） |

## API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/billing/plans` | 套餐列表（公开） |
| GET | `/api/v1/billing/subscription` | 当前订阅（需登录） |
| POST | `/api/v1/billing/orders` | 创建订单 `{ planKey }` |
| GET | `/api/v1/billing/orders/:orderNo` | 查订单状态 |

## 你需要提供什么

1. **Tron 收款钱包**
   - 导出 **账户级 xpub**（路径 `m/44'/195'/0'`，只要公钥，不要助记词进服务器）
   - 或临时用 `TRON_TREASURY_ADDRESS` 固定地址（需人工对账，不推荐长期）

2. **TronGrid API Key**（https://www.trongrid.io/）
   - 写入 `TRONGRID_API_KEY`

3. **定价**（默认 seed）
   - `pro_monthly`：29 USDT / 30 天
   - `pro_yearly`：249 USDT / 365 天

4. **VPS 部署**
   ```bash
   yarn deploy:prod
   pm2 status
   ```

5. **前端** `cd trading-client && yarn deploy`
