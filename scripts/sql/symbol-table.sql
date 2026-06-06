-- 交易对表结构（新建库）
USE `trading-alpha`;

CREATE TABLE IF NOT EXISTS t_trading_symbol (
  f_id INT NOT NULL AUTO_INCREMENT,
  f_base_asset VARCHAR(16) NOT NULL COMMENT '基础币，如 BTC',
  f_symbol VARCHAR(32) NOT NULL COMMENT '交易对，如 BTCUSDT',
  f_exchange VARCHAR(32) NOT NULL DEFAULT 'binance',
  f_display_name VARCHAR(64) NOT NULL DEFAULT '',
  f_sort_order INT NOT NULL DEFAULT 0,
  f_is_default TINYINT NOT NULL DEFAULT 0 COMMENT '1=默认交易对',
  f_access_tier TINYINT NOT NULL DEFAULT 0 COMMENT '0=免费 1=VIP',
  f_status TINYINT NOT NULL DEFAULT 1 COMMENT '1=启用 0=禁用',
  f_create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  f_update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (f_id),
  UNIQUE KEY uniq_trading_symbol (f_exchange, f_symbol),
  KEY idx_trading_symbol_status_sort (f_status, f_sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
