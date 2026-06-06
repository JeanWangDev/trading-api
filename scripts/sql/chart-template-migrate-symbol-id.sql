-- 为已有 t_chart_template 表增加交易对字典 ID 关联
USE `trading-alpha`;

ALTER TABLE t_chart_template
  ADD COLUMN IF NOT EXISTS f_symbol_id INT NULL COMMENT 't_trading_symbol.f_id' AFTER f_symbol;

ALTER TABLE t_chart_template
  ADD INDEX IF NOT EXISTS idx_chart_template_symbol_id (f_symbol_id);

-- 按 symbol 字符串回填 symbol_id（binance）
UPDATE t_chart_template ct
INNER JOIN t_trading_symbol ts
  ON ts.f_symbol = ct.f_symbol AND ts.f_exchange = 'binance' AND ts.f_status = 1
SET ct.f_symbol_id = ts.f_id
WHERE ct.f_symbol_id IS NULL AND ct.f_symbol <> '';
