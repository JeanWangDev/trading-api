USE `trading-alpha`;

CREATE TABLE IF NOT EXISTS t_chain_order_risk_config (
  f_config_key VARCHAR(32) NOT NULL,
  f_risk_enabled TINYINT NOT NULL DEFAULT 1,
  f_min_margin_usdt DECIMAL(18, 6) NOT NULL DEFAULT 1,
  f_max_margin_usdt DECIMAL(18, 6) NOT NULL DEFAULT 100,
  f_min_leverage DECIMAL(18, 6) NOT NULL DEFAULT 1,
  f_max_leverage DECIMAL(18, 6) NOT NULL DEFAULT 10,
  f_max_notional_usdt DECIMAL(18, 6) NOT NULL DEFAULT 500,
  f_max_slippage_percent DECIMAL(18, 6) NOT NULL DEFAULT 2,
  f_daily_order_limit INT NOT NULL DEFAULT 50,
  f_allowed_chains VARCHAR(255) NOT NULL DEFAULT "bsc-testnet",
  f_allowed_protocols VARCHAR(255) NOT NULL DEFAULT "mock-perp",
  f_updated_by BIGINT NULL,
  f_create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  f_update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (f_config_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
