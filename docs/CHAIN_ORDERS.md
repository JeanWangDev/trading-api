# Chain Orders

This module records on-chain trade transactions submitted from the web trading
panel. It is designed for the current BSC Testnet mock-perp flow and leaves the
fields needed for production chain execution and strategy PnL.

## Table

SQL file: `scripts/sql/chain-order.sql`

Table: `t_chain_order`

Important fields:

- `f_tx_hash`: unique chain transaction hash.
- `f_wallet_address`: browser wallet address used for the order.
- `f_user_id`: authenticated platform user id.
- `f_chain`, `f_chain_id`, `f_protocol`, `f_contract_address`: chain adapter
  metadata.
- `f_symbol`, `f_market_type`, `f_side`, `f_order_type`: trading intent.
- `f_margin_usdt`, `f_leverage`, `f_notional_usdt`: risk/accounting inputs.
- `f_strategy_id`, `f_strategy_name`, `f_agent_id`, `f_signal_id`: strategy and
  agent attribution.
- `f_entry_price`, `f_exit_price`, `f_pnl_usdt`, `f_pnl_percent`: fields used
  after real fill/close events are indexed.
- `f_raw_order_json`, `f_raw_receipt_json`: debugging payload snapshots.

## APIs

All endpoints require the existing Bearer JWT.

### `POST /api/v1/chain-orders`

Creates or updates an order by `txHash`.

Used twice by the frontend:

1. Immediately after `eth_sendTransaction` returns a tx hash.
2. Again after `eth_getTransactionReceipt` returns status/block.

### `GET /api/v1/chain-orders`

Returns the current user's orders.

Query:

- `limit`: 1-100, default 20.
- `beforeId`: pagination cursor.
- `status`: `submitted`, `confirmed`, `failed`, `closed`, `cancelled`.
- `chain`: e.g. `bsc-testnet`.
- `symbol`: e.g. `BTCUSDT`.
- `strategyId`: strategy attribution filter.

### `GET /api/v1/chain-orders/:orderId`

Returns one order owned by the current user.

### `GET /api/v1/chain-orders/performance/summary`

Groups orders by strategy and returns total orders, confirmed/failed/closed
counts, total PnL, average PnL percent, and win rate.

The current mock-perp contract only opens positions, so realized PnL stays empty.
The service estimates floating PnL from entry price and the latest market price.
A backend receipt watcher now scans submitted transactions and updates confirmed
/ failed status even if the user closes the browser. After production adapters
are connected, an event indexer should update close price and realized PnL
fields from chain events and oracle/mark prices.

## Backend Receipt Watcher

PM2 processes:

- `trading-chain-order-watch` for production.
- `trading-chain-order-watch-test` for the test environment.

Script: `scripts/chain-order-watch.ts`

Config environment variables:

- `CHAIN_ORDER_WATCH_INTERVAL_MS`: default `15000`.
- `CHAIN_ORDER_WATCH_BATCH_SIZE`: default `50`.
- `CHAIN_ORDER_RPC_TIMEOUT_MS`: default `8000`.
- `BSC_TESTNET_RPC_URL`: optional BSC Testnet RPC override.
- `BSC_RPC_URL`: optional BSC mainnet RPC override.

The watcher polls `submitted` orders, calls `eth_getTransactionReceipt`, and
updates `f_tx_status`, `f_receipt_status`, `f_block_number`, and
`f_raw_receipt_json`.

## Production PnL Plan

For real on-chain execution, add a chain indexer service:

1. Subscribe to contract events or poll blocks by tx hash.
2. Normalize fill events into entry/exit price, fee, funding, and position size.
3. Compute realized PnL on close:
   - Long: `(exit - entry) / entry * notional - fees - funding`.
   - Short: `(entry - exit) / entry * notional - fees - funding`.
4. Update `t_chain_order` with `closed`, `exitPrice`, `pnlUsdt`, and
   `pnlPercent`.
5. Attribute PnL to `strategyId`, `agentId`, and `signalId`.

Keep user-facing PnL marked as estimated until the settlement event is final.
