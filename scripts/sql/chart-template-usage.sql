-- 图表模版使用统计（应用 / 复制），用于周榜、月榜
USE `trading-alpha`;

CREATE TABLE IF NOT EXISTS t_chart_template_usage (
  f_id BIGINT NOT NULL AUTO_INCREMENT,
  f_template_id VARCHAR(64) NOT NULL COMMENT 't_chart_template.f_template_id',
  f_user_id BIGINT NULL COMMENT '登录用户 ID，游客为空',
  f_event_type VARCHAR(16) NOT NULL COMMENT 'apply | copy',
  f_create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (f_id),
  KEY idx_ct_usage_template_time (f_template_id, f_create_time),
  KEY idx_ct_usage_time (f_create_time),
  KEY idx_ct_usage_user_dedup (f_template_id, f_user_id, f_event_type, f_create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
