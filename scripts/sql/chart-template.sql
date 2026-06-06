-- 用户图表指标模版（MVP Lite：指标 + 可选参考币对，不含周期/画线）
USE `trading-alpha`;

CREATE TABLE IF NOT EXISTS t_chart_template (
  f_id BIGINT NOT NULL AUTO_INCREMENT,
  f_template_id VARCHAR(64) NOT NULL COMMENT '对外 UUID',
  f_user_id BIGINT NOT NULL,
  f_name VARCHAR(128) NOT NULL DEFAULT '',
  f_symbol VARCHAR(32) NOT NULL DEFAULT '' COMMENT '参考交易对冗余展示，如 BTCUSDT',
  f_symbol_id INT NULL COMMENT 't_trading_symbol.f_id，空表示不限',
  f_indicator_ids JSON NOT NULL COMMENT '["ma_20","rsi_14"]',
  f_visibility TINYINT NOT NULL DEFAULT 0 COMMENT '0=私有 1=公开',
  f_is_default TINYINT NOT NULL DEFAULT 0 COMMENT '1=用户默认模版',
  f_status TINYINT NOT NULL DEFAULT 1 COMMENT '1=有效 0=删除',
  f_create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  f_update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (f_id),
  UNIQUE KEY uniq_template_id (f_template_id),
  KEY idx_chart_template_user (f_user_id, f_status, f_update_time),
  KEY idx_chart_template_symbol_id (f_symbol_id),
  KEY idx_chart_template_public (f_visibility, f_status, f_update_time),
  KEY idx_chart_template_user_default (f_user_id, f_is_default, f_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
