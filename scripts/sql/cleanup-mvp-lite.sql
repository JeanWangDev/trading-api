-- MVP Lite 数据清理（在已有库上执行一次即可）
-- 删除：无币种绑定、已下线数据源、非 MVP 事件类型
USE `trading-alpha`;

-- 1) 无主币种（空 symbols 或无效 JSON）
DELETE FROM t_event
WHERE f_symbols IS NULL
   OR JSON_LENGTH(COALESCE(f_symbols, JSON_ARRAY())) = 0;

-- 2) 已移除的 ingest 来源
DELETE FROM t_event
WHERE f_source LIKE 'scrape_%'
   OR f_source LIKE 'twitter_%'
   OR f_source IN ('fear_greed', 'defillama', 'whale_alert')
   OR f_source LIKE 'whale%';

-- 3) 扩源 RSS（MVP 仅保留 coindesk + odaily）
DELETE FROM t_event
WHERE f_source LIKE 'rss_%'
  AND f_source NOT IN ('rss_coindesk', 'rss_odaily');

-- 4) 非 MVP 事件类型（保留 news、liquidation）
DELETE FROM t_event
WHERE f_type NOT IN ('news', 'liquidation');
