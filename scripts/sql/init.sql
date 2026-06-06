-- trading-api auth schema (demo-server style: t_ tables, f_ columns)
-- Database: trading-alpha

CREATE DATABASE IF NOT EXISTS `trading-alpha`
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `trading-alpha`;

-- Role dictionary (5 roles)
CREATE TABLE IF NOT EXISTS t_role (
  f_id INT NOT NULL AUTO_INCREMENT,
  f_role_key VARCHAR(32) NOT NULL,
  f_role_name VARCHAR(64) NOT NULL,
  f_role_level TINYINT NOT NULL DEFAULT 1,
  f_status TINYINT NOT NULL DEFAULT 1 COMMENT '1=active 0=disabled',
  f_create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  f_update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (f_id),
  UNIQUE KEY uniq_role_key (f_role_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO t_role (f_role_key, f_role_name, f_role_level) VALUES
  ('normal_user', '普通用户', 1),
  ('vip_user', '会员', 2),
  ('staff_operator', '运营', 3),
  ('admin', '管理员', 4),
  ('super_admin', '超级管理员', 5)
ON DUPLICATE KEY UPDATE
  f_role_name = VALUES(f_role_name),
  f_role_level = VALUES(f_role_level);

CREATE TABLE IF NOT EXISTS t_user (
  f_id BIGINT NOT NULL AUTO_INCREMENT,
  f_email VARCHAR(191) NOT NULL,
  f_nickname VARCHAR(64) NOT NULL DEFAULT '',
  f_password_hash VARCHAR(255) NOT NULL,
  f_role_id INT NOT NULL,
  f_status TINYINT NOT NULL DEFAULT 1 COMMENT '1=active 0=disabled',
  f_last_login_time DATETIME NULL,
  f_create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  f_update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (f_id),
  UNIQUE KEY uniq_user_email (f_email),
  KEY idx_user_role (f_role_id),
  CONSTRAINT fk_user_role FOREIGN KEY (f_role_id) REFERENCES t_role (f_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS t_user_role (
  f_id BIGINT NOT NULL AUTO_INCREMENT,
  f_user_id BIGINT NOT NULL,
  f_role_id INT NOT NULL,
  f_is_primary TINYINT NOT NULL DEFAULT 1,
  f_create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (f_id),
  UNIQUE KEY uniq_user_role (f_user_id, f_role_id),
  KEY idx_user_role_user (f_user_id),
  CONSTRAINT fk_user_role_user FOREIGN KEY (f_user_id) REFERENCES t_user (f_id),
  CONSTRAINT fk_user_role_role FOREIGN KEY (f_role_id) REFERENCES t_role (f_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS t_user_password_history (
  f_id BIGINT NOT NULL AUTO_INCREMENT,
  f_user_id BIGINT NOT NULL,
  f_password_hash VARCHAR(255) NOT NULL,
  f_reason VARCHAR(32) NOT NULL DEFAULT 'register',
  f_create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (f_id),
  KEY idx_pwd_hist_user_time (f_user_id, f_create_time),
  CONSTRAINT fk_pwd_hist_user FOREIGN KEY (f_user_id) REFERENCES t_user (f_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS t_user_reset_token (
  f_id BIGINT NOT NULL AUTO_INCREMENT,
  f_user_id BIGINT NOT NULL,
  f_token_hash VARCHAR(128) NOT NULL,
  f_expire_time DATETIME NOT NULL,
  f_used TINYINT NOT NULL DEFAULT 0,
  f_used_time DATETIME NULL,
  f_create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (f_id),
  UNIQUE KEY uniq_reset_token_hash (f_token_hash),
  KEY idx_reset_user_used (f_user_id, f_used),
  CONSTRAINT fk_reset_user FOREIGN KEY (f_user_id) REFERENCES t_user (f_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
