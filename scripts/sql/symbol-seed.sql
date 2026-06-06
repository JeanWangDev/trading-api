-- 交易对种子数据（需先执行 symbol-table.sql 与 trading-symbol-access-tier.sql）
USE `trading-alpha`;

INSERT INTO t_trading_symbol (f_base_asset, f_symbol, f_exchange, f_display_name, f_sort_order, f_is_default, f_access_tier) VALUES
  ('BTC', 'BTCUSDT', 'binance', 'Bitcoin', 10, 1, 0),
  ('ETH', 'ETHUSDT', 'binance', 'Ethereum', 20, 0, 0),
  ('SOL', 'SOLUSDT', 'binance', 'Solana', 30, 0, 0),
  ('BNB', 'BNBUSDT', 'binance', 'BNB', 40, 0, 1),
  ('XRP', 'XRPUSDT', 'binance', 'XRP', 50, 0, 1),
  ('DOGE', 'DOGEUSDT', 'binance', 'Dogecoin', 60, 0, 1),
  ('ADA', 'ADAUSDT', 'binance', 'Cardano', 70, 0, 1),
  ('AVAX', 'AVAXUSDT', 'binance', 'Avalanche', 80, 0, 1),
  ('LINK', 'LINKUSDT', 'binance', 'Chainlink', 90, 0, 1),
  ('DOT', 'DOTUSDT', 'binance', 'Polkadot', 100, 0, 1)
ON DUPLICATE KEY UPDATE
  f_display_name = VALUES(f_display_name),
  f_sort_order = VALUES(f_sort_order),
  f_is_default = VALUES(f_is_default),
  f_access_tier = VALUES(f_access_tier),
  f_status = VALUES(f_status);
