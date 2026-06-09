-- Strategy marketplace (reference SQL — apply manually in TiDB)
USE `trading-alpha`;

CREATE TABLE IF NOT EXISTS t_strategy (
  f_id INT NOT NULL AUTO_INCREMENT,
  f_strategy_key VARCHAR(32) NOT NULL,
  f_plan_key VARCHAR(32) NOT NULL,
  f_name VARCHAR(64) NOT NULL,
  f_summary VARCHAR(255) NOT NULL DEFAULT '',
  f_description TEXT NOT NULL,
  f_symbol VARCHAR(32) NOT NULL DEFAULT 'BTCUSDT',
  f_interval VARCHAR(16) NOT NULL DEFAULT '1h',
  f_template_id VARCHAR(64) NULL,
  f_tags VARCHAR(255) NOT NULL DEFAULT '',
  f_sort_order INT NOT NULL DEFAULT 0,
  f_status TINYINT NOT NULL DEFAULT 1 COMMENT '1=active 0=disabled',
  f_create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  f_update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (f_id),
  UNIQUE KEY uniq_strategy_key (f_strategy_key),
  UNIQUE KEY uniq_strategy_plan_key (f_plan_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Strategy billing plans (plan_key must start with strategy_)
INSERT INTO t_membership_plan (
  f_plan_key, f_name, f_description, f_price_usdt, f_duration_days,
  f_target_role_key, f_sort_order
) VALUES
  (
    'strategy_btc_trend_m',
    'BTC 趋势策略 · 月付',
    '基于均线与动能的 BTC 趋势信号，含入场/止损参考',
    19.000000, 30, 'normal_user', 10
  ),
  (
    'strategy_eth_swing_m',
    'ETH 波段策略 · 月付',
    'ETH 多周期波段信号，适合中线持仓',
    15.000000, 30, 'normal_user', 11
  )
ON DUPLICATE KEY UPDATE
  f_name = VALUES(f_name),
  f_description = VALUES(f_description),
  f_price_usdt = VALUES(f_price_usdt),
  f_duration_days = VALUES(f_duration_days),
  f_sort_order = VALUES(f_sort_order);

INSERT INTO t_strategy (
  f_strategy_key, f_plan_key, f_name, f_summary, f_description,
  f_symbol, f_interval, f_tags, f_sort_order
) VALUES
  (
    'btc_trend',
    'strategy_btc_trend_m',
    'BTC 趋势策略',
    '均线 + 动能 · 趋势跟踪',
    '订阅后可在策略详情页查看实时多空信号、价位参考与检查清单。信号基于盘面助手规则，适用于 BTC 主流趋势行情。',
    'BTCUSDT', '1h', 'BTC,趋势,中线', 1
  ),
  (
    'eth_swing',
    'strategy_eth_swing_m',
    'ETH 波段策略',
    '波段 · 多周期共振',
    '订阅后解锁 ETH 波段信号与模板建议。适合在震荡与趋势切换时捕捉波段机会。',
    'ETHUSDT', '4h', 'ETH,波段', 2
  )
ON DUPLICATE KEY UPDATE
  f_plan_key = VALUES(f_plan_key),
  f_name = VALUES(f_name),
  f_summary = VALUES(f_summary),
  f_description = VALUES(f_description),
  f_symbol = VALUES(f_symbol),
  f_interval = VALUES(f_interval),
  f_tags = VALUES(f_tags),
  f_sort_order = VALUES(f_sort_order);
