-- Mode B: user-created strategies + copy-follow (apply manually in TiDB)
USE `trading-alpha`;

ALTER TABLE t_strategy
  ADD COLUMN f_user_id BIGINT NOT NULL DEFAULT 0 COMMENT '0=platform official' AFTER f_id;

ALTER TABLE t_strategy
  ADD COLUMN f_visibility TINYINT NOT NULL DEFAULT 1 COMMENT '0=draft 1=marketplace' AFTER f_status;

ALTER TABLE t_strategy
  ADD COLUMN f_follow_fee_usdt DECIMAL(18, 6) NOT NULL DEFAULT 0 AFTER f_visibility;

ALTER TABLE t_strategy
  ADD COLUMN f_platform_fee_rate DECIMAL(5, 2) NOT NULL DEFAULT 20.00 AFTER f_follow_fee_usdt;

ALTER TABLE t_strategy
  ADD COLUMN f_source_strategy_key VARCHAR(32) NULL AFTER f_platform_fee_rate;

ALTER TABLE t_strategy
  ADD COLUMN f_follower_count INT NOT NULL DEFAULT 0 AFTER f_source_strategy_key;

UPDATE t_strategy SET f_user_id = 0, f_visibility = 1;

CREATE TABLE IF NOT EXISTS t_strategy_follow (
  f_id INT NOT NULL AUTO_INCREMENT,
  f_strategy_id INT NOT NULL,
  f_strategy_key VARCHAR(32) NOT NULL,
  f_follower_user_id BIGINT NOT NULL,
  f_subscription_id INT NULL,
  f_order_id INT NULL,
  f_fee_usdt DECIMAL(18, 6) NOT NULL DEFAULT 0,
  f_platform_fee_usdt DECIMAL(18, 6) NOT NULL DEFAULT 0,
  f_creator_fee_usdt DECIMAL(18, 6) NOT NULL DEFAULT 0,
  f_status TINYINT NOT NULL DEFAULT 1 COMMENT '1=active 0=cancelled',
  f_create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  f_update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (f_id),
  UNIQUE KEY uniq_strategy_follower (f_strategy_key, f_follower_user_id),
  KEY idx_follower_user (f_follower_user_id),
  KEY idx_strategy_id (f_strategy_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
