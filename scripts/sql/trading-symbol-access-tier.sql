-- 交易对访问级别：0=免费 1=VIP
USE `trading-alpha`;

ALTER TABLE t_trading_symbol
  ADD COLUMN IF NOT EXISTS f_access_tier TINYINT NOT NULL DEFAULT 0 COMMENT '0=免费 1=VIP' AFTER f_is_default;

-- 默认：BTC/ETH/SOL 免费，其余 VIP
UPDATE t_trading_symbol SET f_access_tier = 0 WHERE f_symbol IN ('BTCUSDT', 'ETHUSDT', 'SOLUSDT');
UPDATE t_trading_symbol SET f_access_tier = 1 WHERE f_symbol NOT IN ('BTCUSDT', 'ETHUSDT', 'SOLUSDT');
