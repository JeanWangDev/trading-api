-- Event Intelligence: t_event（在 init.sql 建库后执行）
USE `trading-alpha`;

CREATE TABLE IF NOT EXISTS t_event (
  f_id BIGINT NOT NULL AUTO_INCREMENT,
  f_event_id VARCHAR(64) NOT NULL COMMENT '对外 UUID',
  f_source VARCHAR(32) NOT NULL COMMENT 'rss_coindesk / rss_odaily / binance_liquidation',
  f_external_id VARCHAR(512) NOT NULL COMMENT '源站唯一 ID，用于去重',
  f_type VARCHAR(32) NOT NULL DEFAULT 'news' COMMENT 'news / liquidation',
  f_title VARCHAR(500) NOT NULL DEFAULT '',
  f_description TEXT NULL,
  f_url VARCHAR(1024) NOT NULL DEFAULT '',
  f_cover VARCHAR(1024) NOT NULL DEFAULT '',
  f_symbols JSON NULL COMMENT '["BTC"] 主币种单元素数组',
  f_sentiment VARCHAR(16) NOT NULL DEFAULT 'neutral' COMMENT 'bullish / bearish / neutral',
  f_impact TINYINT NOT NULL DEFAULT 0 COMMENT '0-100',
  f_status TINYINT NOT NULL DEFAULT 1 COMMENT '1=published 0=hidden',
  f_published_at BIGINT NOT NULL COMMENT '源站时间 ms',
  f_ingested_at BIGINT NOT NULL COMMENT '入库时间 ms',
  f_create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  f_update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (f_id),
  UNIQUE KEY uniq_event_id (f_event_id),
  UNIQUE KEY uniq_source_external (f_source, f_external_id(191)),
  KEY idx_event_published (f_status, f_published_at),
  KEY idx_event_type (f_type, f_published_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
