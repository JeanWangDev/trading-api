-- 官方预置公开模版（f_user_id=0，所有人免登录可看可用）
USE `trading-alpha`;

INSERT INTO t_chart_template (
  f_template_id,
  f_user_id,
  f_name,
  f_symbol,
  f_symbol_id,
  f_indicator_ids,
  f_visibility,
  f_is_default,
  f_status
) VALUES
  (
    'official-0001-btc-trend',
    0,
    '官方 · BTC 趋势入门',
    'BTCUSDT',
    (SELECT f_id FROM t_trading_symbol WHERE f_symbol = 'BTCUSDT' AND f_exchange = 'binance' LIMIT 1),
    '["technical.moving-average-exponential","technical.macd","technical.relative-strength-index"]',
    1,
    0,
    1
  ),
  (
    'official-0002-eth-momentum',
    0,
    '官方 · ETH 动量监控',
    'ETHUSDT',
    (SELECT f_id FROM t_trading_symbol WHERE f_symbol = 'ETHUSDT' AND f_exchange = 'binance' LIMIT 1),
    '["technical.relative-strength-index","technical.macd","technical.volume"]',
    1,
    0,
    1
  ),
  (
    'official-0003-btc-volatility',
    0,
    '官方 · BTC 波动区间',
    'BTCUSDT',
    (SELECT f_id FROM t_trading_symbol WHERE f_symbol = 'BTCUSDT' AND f_exchange = 'binance' LIMIT 1),
    '["technical.bollinger-bands","technical.average-true-range"]',
    1,
    0,
    1
  ),
  (
    'official-0004-universal-macd-rsi',
    0,
    '官方 · 通用 MACD + RSI',
    '',
    NULL,
    '["technical.macd","technical.relative-strength-index"]',
    1,
    0,
    1
  )
ON DUPLICATE KEY UPDATE
  f_name = VALUES(f_name),
  f_symbol = VALUES(f_symbol),
  f_symbol_id = VALUES(f_symbol_id),
  f_indicator_ids = VALUES(f_indicator_ids),
  f_visibility = VALUES(f_visibility),
  f_status = VALUES(f_status);
