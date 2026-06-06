-- 邮箱验证码（注册 / 重置密码）
USE `trading-alpha`;

CREATE TABLE IF NOT EXISTS t_email_verification (
  f_id BIGINT NOT NULL AUTO_INCREMENT,
  f_email VARCHAR(255) NOT NULL,
  f_purpose VARCHAR(32) NOT NULL COMMENT 'register | reset_password',
  f_code_hash VARCHAR(64) NOT NULL,
  f_expire_time DATETIME NOT NULL,
  f_used TINYINT NOT NULL DEFAULT 0,
  f_used_time DATETIME NULL,
  f_create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (f_id),
  KEY idx_email_verification_lookup (f_email, f_purpose, f_used, f_expire_time),
  KEY idx_email_verification_created (f_create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
