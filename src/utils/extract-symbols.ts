const TICKER_RE =
  /\b(BTC|ETH|SOL|BNB|XRP|DOGE|ADA|AVAX|DOT|MATIC|POL|LINK|UNI|ATOM|LTC|BCH|NEAR|APT|SUI|ARB|OP|HYPE|PEPE|SHIB|TRX|TON|FIL|INJ|SEI|TIA|WLD|STX|RUNE|FTM|AAVE|MKR|CRV|LDO)\b/gi;

/** 从标题/正文提取可能相关的币种符号（大写去重） */
export function extractSymbols(...texts: Array<string | null | undefined>): string[] {
  const found = new Set<string>();

  for (const text of texts) {
    if (!text) continue;
    for (const match of text.matchAll(TICKER_RE)) {
      found.add(match[0].toUpperCase());
    }
  }

  return [...found].slice(0, 12);
}
