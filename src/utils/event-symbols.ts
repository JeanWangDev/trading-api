/** 事件主币种：库内仅存基础币（大写、无 USDT 后缀） */
export function normalizeBaseAsset(raw: string | undefined | null): string | null {
  const value = raw?.trim().toUpperCase();
  if (!value) return null;
  return value.replace(/USDT$/i, "") || null;
}

/** 从候选列表取第一个有效主币种，用于入库与发布 */
export function resolvePrimarySymbol(
  ...candidates: Array<string | null | undefined>
): string | null {
  for (const candidate of candidates) {
    const base = normalizeBaseAsset(candidate);
    if (base) return base;
  }
  return null;
}

/** 基础币 → 默认 USDT 交易对 */
export function toTradingPair(baseAsset: string, quote = "USDT"): string {
  const base = normalizeBaseAsset(baseAsset);
  if (!base) return `BTC${quote}`;
  return `${base}${quote}`;
}

/** 交易对 → API / 筛选用的基础币 */
export function baseFromTradingPair(pair: string): string {
  return normalizeBaseAsset(pair) ?? "BTC";
}
