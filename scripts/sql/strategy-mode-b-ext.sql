-- Mode B extensions: paper stats, creator payout, OKX copy trading
USE `trading-alpha`;

CREATE TABLE IF NOT EXISTS t_strategy_paper_state (
  f_strategy_key VARCHAR(32) NOT NULL,
  f_equity_usdt DECIMAL(18, 6) NOT NULL DEFAULT 10000.000000,
  f_peak_equity_usdt DECIMAL(18, 6) NOT NULL DEFAULT 10000.000000,
  f_position_side VARCHAR(8) NULL COMMENT 'long|short',
  f_entry_price DECIMAL(18, 8) NULL,
  f_position_notional DECIMAL(18, 6) NOT NULL DEFAULT 0,
  f_last_signal VARCHAR(16) NULL,
  f_last_price DECIMAL(18, 8) NULL,
  f_total_return_pct DECIMAL(10, 4) NOT NULL DEFAULT 0,
  f_max_drawdown_pct DECIMAL(10, 4) NOT NULL DEFAULT 0,
  f_sharpe_ratio DECIMAL(10, 4) NOT NULL DEFAULT 0,
  f_win_rate DECIMAL(10, 4) NOT NULL DEFAULT 0,
  f_trade_count INT NOT NULL DEFAULT 0,
  f_win_count INT NOT NULL DEFAULT 0,
  f_update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (f_strategy_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS t_strategy_paper_trade (
  f_id BIGINT NOT NULL AUTO_INCREMENT,
  f_strategy_key VARCHAR(32) NOT NULL,
  f_side VARCHAR(8) NOT NULL,
  f_entry_price DECIMAL(18, 8) NOT NULL,
  f_exit_price DECIMAL(18, 8) NOT NULL,
  f_notional_usdt DECIMAL(18, 6) NOT NULL,
  f_pnl_usdt DECIMAL(18, 6) NOT NULL,
  f_pnl_pct DECIMAL(10, 4) NOT NULL,
  f_opened_at DATETIME NOT NULL,
  f_closed_at DATETIME NOT NULL,
  PRIMARY KEY (f_id),
  KEY idx_paper_trade_strategy (f_strategy_key, f_closed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS t_creator_balance (
  f_user_id BIGINT NOT NULL,
  f_available_usdt DECIMAL(18, 6) NOT NULL DEFAULT 0,
  f_pending_usdt DECIMAL(18, 6) NOT NULL DEFAULT 0,
  f_lifetime_earned_usdt DECIMAL(18, 6) NOT NULL DEFAULT 0,
  f_update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (f_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS t_creator_ledger (
  f_id BIGINT NOT NULL AUTO_INCREMENT,
  f_user_id BIGINT NOT NULL,
  f_type VARCHAR(32) NOT NULL COMMENT 'follow_fee|withdraw|adjust',
  f_amount_usdt DECIMAL(18, 6) NOT NULL,
  f_ref_follow_id INT NULL,
  f_ref_withdrawal_id BIGINT NULL,
  f_note VARCHAR(255) NOT NULL DEFAULT '',
  f_create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (f_id),
  KEY idx_creator_ledger_user (f_user_id, f_create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS t_creator_withdrawal (
  f_id BIGINT NOT NULL AUTO_INCREMENT,
  f_user_id BIGINT NOT NULL,
  f_amount_usdt DECIMAL(18, 6) NOT NULL,
  f_chain VARCHAR(16) NOT NULL DEFAULT 'TRC20',
  f_address VARCHAR(128) NOT NULL,
  f_status VARCHAR(16) NOT NULL DEFAULT 'pending' COMMENT 'pending|paid|rejected',
  f_tx_hash VARCHAR(128) NULL,
  f_create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  f_update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (f_id),
  KEY idx_creator_withdraw_user (f_user_id, f_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS t_exchange_connection (
  f_id INT NOT NULL AUTO_INCREMENT,
  f_user_id BIGINT NOT NULL,
  f_exchange VARCHAR(16) NOT NULL DEFAULT 'okx',
  f_label VARCHAR(64) NOT NULL DEFAULT '',
  f_api_key_enc TEXT NOT NULL,
  f_secret_enc TEXT NOT NULL,
  f_passphrase_enc TEXT NOT NULL,
  f_permissions VARCHAR(64) NOT NULL DEFAULT 'trade',
  f_status TINYINT NOT NULL DEFAULT 1,
  f_create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  f_update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (f_id),
  UNIQUE KEY uniq_user_exchange (f_user_id, f_exchange)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS t_copy_subscription (
  f_id INT NOT NULL AUTO_INCREMENT,
  f_user_id BIGINT NOT NULL,
  f_strategy_key VARCHAR(32) NOT NULL,
  f_exchange_connection_id INT NOT NULL,
  f_trade_mode VARCHAR(16) NOT NULL DEFAULT 'live' COMMENT 'live|paper',
  f_order_size_usdt DECIMAL(18, 6) NOT NULL DEFAULT 100,
  f_status TINYINT NOT NULL DEFAULT 1,
  f_last_signal VARCHAR(16) NULL,
  f_create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  f_update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (f_id),
  UNIQUE KEY uniq_copy_user_strategy (f_user_id, f_strategy_key),
  KEY idx_copy_strategy (f_strategy_key, f_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS t_copy_order_log (
  f_id BIGINT NOT NULL AUTO_INCREMENT,
  f_copy_subscription_id INT NOT NULL,
  f_strategy_key VARCHAR(32) NOT NULL,
  f_signal VARCHAR(16) NOT NULL,
  f_side VARCHAR(8) NOT NULL,
  f_symbol VARCHAR(32) NOT NULL,
  f_size_usdt DECIMAL(18, 6) NOT NULL,
  f_exchange_order_id VARCHAR(64) NULL,
  f_status VARCHAR(16) NOT NULL DEFAULT 'pending',
  f_error_message VARCHAR(255) NULL,
  f_create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (f_id),
  KEY idx_copy_order_sub (f_copy_subscription_id, f_create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
