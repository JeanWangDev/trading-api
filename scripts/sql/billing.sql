-- Membership & crypto billing (TRC20-USDT MVP)
USE `trading-alpha`;

CREATE TABLE IF NOT EXISTS t_membership_plan (
  f_id INT NOT NULL AUTO_INCREMENT,
  f_plan_key VARCHAR(32) NOT NULL,
  f_name VARCHAR(64) NOT NULL,
  f_description VARCHAR(255) NOT NULL DEFAULT '',
  f_price_usdt DECIMAL(18, 6) NOT NULL,
  f_duration_days INT NOT NULL,
  f_target_role_key VARCHAR(32) NOT NULL DEFAULT 'vip_user',
  f_chain VARCHAR(16) NOT NULL DEFAULT 'TRC20',
  f_asset VARCHAR(16) NOT NULL DEFAULT 'USDT',
  f_sort_order INT NOT NULL DEFAULT 0,
  f_status TINYINT NOT NULL DEFAULT 1 COMMENT '1=active 0=disabled',
  f_create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  f_update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (f_id),
  UNIQUE KEY uniq_plan_key (f_plan_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO t_membership_plan (
  f_plan_key, f_name, f_description, f_price_usdt, f_duration_days, f_sort_order
) VALUES
  ('pro_monthly', 'Polaris Pro 月付', '解锁全部交易对与会员权益', 29.000000, 30, 1),
  ('pro_yearly', 'Polaris Pro 年付', '年付更省，解锁全部交易对与会员权益', 249.000000, 365, 2)
ON DUPLICATE KEY UPDATE
  f_name = VALUES(f_name),
  f_description = VALUES(f_description),
  f_price_usdt = VALUES(f_price_usdt),
  f_duration_days = VALUES(f_duration_days),
  f_sort_order = VALUES(f_sort_order);

CREATE TABLE IF NOT EXISTS t_payment_address_index (
  f_id TINYINT NOT NULL DEFAULT 1,
  f_next_index INT NOT NULL DEFAULT 0,
  f_update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (f_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO t_payment_address_index (f_id, f_next_index) VALUES (1, 0)
ON DUPLICATE KEY UPDATE f_id = f_id;

CREATE TABLE IF NOT EXISTS t_payment_order (
  f_id BIGINT NOT NULL AUTO_INCREMENT,
  f_order_no VARCHAR(32) NOT NULL,
  f_user_id BIGINT NOT NULL,
  f_plan_id INT NOT NULL,
  f_plan_key VARCHAR(32) NOT NULL,
  f_chain VARCHAR(16) NOT NULL,
  f_asset VARCHAR(16) NOT NULL,
  f_amount_usdt DECIMAL(18, 6) NOT NULL,
  f_deposit_address VARCHAR(64) NOT NULL,
  f_address_index INT NULL,
  f_status VARCHAR(16) NOT NULL DEFAULT 'pending' COMMENT 'pending|paid|expired|cancelled',
  f_tx_hash VARCHAR(128) NULL,
  f_paid_amount_usdt DECIMAL(18, 6) NULL,
  f_expire_time DATETIME NOT NULL,
  f_paid_time DATETIME NULL,
  f_create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  f_update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (f_id),
  UNIQUE KEY uniq_order_no (f_order_no),
  KEY idx_payment_order_user (f_user_id),
  KEY idx_payment_order_status_expire (f_status, f_expire_time),
  KEY idx_payment_order_address (f_deposit_address),
  CONSTRAINT fk_payment_order_user FOREIGN KEY (f_user_id) REFERENCES t_user (f_id),
  CONSTRAINT fk_payment_order_plan FOREIGN KEY (f_plan_id) REFERENCES t_membership_plan (f_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS t_user_subscription (
  f_id BIGINT NOT NULL AUTO_INCREMENT,
  f_user_id BIGINT NOT NULL,
  f_plan_id INT NOT NULL,
  f_plan_key VARCHAR(32) NOT NULL,
  f_order_id BIGINT NULL,
  f_status VARCHAR(16) NOT NULL DEFAULT 'active' COMMENT 'active|expired',
  f_starts_at DATETIME NOT NULL,
  f_ends_at DATETIME NOT NULL,
  f_create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  f_update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (f_id),
  KEY idx_subscription_user_status (f_user_id, f_status),
  KEY idx_subscription_ends (f_status, f_ends_at),
  CONSTRAINT fk_subscription_user FOREIGN KEY (f_user_id) REFERENCES t_user (f_id),
  CONSTRAINT fk_subscription_plan FOREIGN KEY (f_plan_id) REFERENCES t_membership_plan (f_id),
  CONSTRAINT fk_subscription_order FOREIGN KEY (f_order_id) REFERENCES t_payment_order (f_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
