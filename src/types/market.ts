/**
 * Unified market-data types.
 * These shapes are exchange-agnostic — every adapter MUST translate its
 * upstream payload into these structures.
 */

export const CANONICAL_INTERVALS = [
  "1m",
  "3m",
  "5m",
  "15m",
  "30m",
  "1h",
  "2h",
  "4h",
  "6h",
  "8h",
  "12h",
  "1d",
  "3d",
  "1w",
  "1M",
] as const;

export type CanonicalInterval = (typeof CANONICAL_INTERVALS)[number];

/** OHLCV bar in canonical form. `time` is **milliseconds** since epoch. */
export interface IKline {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface IKlineTick extends IKline {
  /** Whether this bar has closed (true) or is still forming (false). */
  isFinal: boolean;
}

/**
 * Aggregate trade tick — the "between-bar" feed used to smoothly update the
 * forming candle's close price + the last-trade price ticker.
 *
 * `isBuyerMaker === true` means the taker SOLD into a resting bid, so it's
 * effectively a down-tick on the tape (and vice versa).
 */
export interface ITradeTick {
  time: number;
  price: number;
  quantity: number;
  isBuyerMaker: boolean;
}

export interface IExchangeMeta {
  /** Lowercase identifier, e.g. "binance", "okx". */
  id: string;
  /** Human-readable name shown to end users. */
  name: string;
  /** Market description, e.g. "Binance Spot". */
  description: string;
}

export interface ISymbolSummary {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  description: string;
}

export interface ISymbolInfo extends ISymbolSummary {
  pricePrecision: number;
  quantityPrecision: number;
  supportedIntervals: CanonicalInterval[];
}

/** Rolling 24h ticker stats (exchange-native window, not calendar day). */
export interface ITicker24h {
  symbol: string;
  lastPrice: number;
  openPrice: number;
  highPrice: number;
  lowPrice: number;
  priceChange: number;
  priceChangePercent: number;
  /** Base-asset volume over the last 24h. */
  volume: number;
  /** Quote-asset volume over the last 24h. */
  quoteVolume: number;
}
