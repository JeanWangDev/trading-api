-- 模版可见性与默认标记
USE `trading-alpha`;

ALTER TABLE t_chart_template
  ADD COLUMN IF NOT EXISTS f_visibility TINYINT NOT NULL DEFAULT 0 COMMENT '0=私有 1=公开' AFTER f_indicator_ids;

ALTER TABLE t_chart_template
  ADD COLUMN IF NOT EXISTS f_is_default TINYINT NOT NULL DEFAULT 0 COMMENT '1=用户默认模版' AFTER f_visibility;

ALTER TABLE t_chart_template
  ADD INDEX IF NOT EXISTS idx_chart_template_public (f_visibility, f_status, f_update_time);

ALTER TABLE t_chart_template
  ADD INDEX IF NOT EXISTS idx_chart_template_user_default (f_user_id, f_is_default, f_status);
