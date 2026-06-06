import type { IKline, IKlineTick, ITicker24h, ITradeTick } from "@/types/market";

/**
 * Binance spot kline tuple (from REST and the `k` payload of the WS event
 * share the same numeric layout, just spelled differently).
 *
 * Reference: https://developers.binance.com/docs/binance-spot-api-docs/rest-api/market-data-endpoints#klinecandlestick-data
 */
export type BinanceKlineTuple = [
  number, // 0  Kline open time (ms)
  string, // 1  Open
  string, // 2  High
  string, // 3  Low
  string, // 4  Close
  string, // 5  Volume
  number, // 6  Kline close time
  string, // 7  Quote asset volume
  number, // 8  Number of trades
  string, // 9  Taker buy base asset volume
  string, // 10 Taker buy quote asset volume
  string, // 11 Ignore
];

export function mapBinanceKline(row: BinanceKlineTuple): IKline {
  return {
    time: row[0],
    open: parseFloat(row[1]),
    high: parseFloat(row[2]),
    low: parseFloat(row[3]),
    close: parseFloat(row[4]),
    volume: parseFloat(row[5]),
  };
}

export interface BinanceKlineEvent {
  e: "kline";
  E: number;
  s: string;
  k: {
    t: number; // open time
    T: number; // close time
    s: string; // symbol
    i: string; // interval
    o: string;
    c: string;
    h: string;
    l: string;
    v: string;
    x: boolean; // is this kline closed?
  };
}

export function mapBinanceKlineEvent(evt: BinanceKlineEvent): IKlineTick {
  const k = evt.k;

  return {
    time: k.t,
    open: parseFloat(k.o),
    high: parseFloat(k.h),
    low: parseFloat(k.l),
    close: parseFloat(k.c),
    volume: parseFloat(k.v),
    isFinal: k.x,
  };
}

/**
 * Binance aggregate-trade payload.
 * https://developers.binance.com/docs/binance-spot-api-docs/web-socket-streams#aggregate-trade-streams
 */
export interface BinanceAggTradeEvent {
  e: "aggTrade";
  E: number;
  s: string;
  a: number; // aggregate trade ID
  p: string; // price
  q: string; // quantity
  f: number; // first trade ID
  l: number; // last trade ID
  T: number; // trade time
  m: boolean; // is the buyer the market maker?
}

export function mapBinanceAggTrade(evt: BinanceAggTradeEvent): ITradeTick {
  return {
    time: evt.T,
    price: parseFloat(evt.p),
    quantity: parseFloat(evt.q),
    isBuyerMaker: evt.m,
  };
}

/** Binance 24hr ticker payload from GET /api/v3/ticker/24hr */
export interface BinanceTicker24hResponse {
  symbol: string;
  priceChange: string;
  priceChangePercent: string;
  openPrice: string;
  highPrice: string;
  lowPrice: string;
  lastPrice: string;
  volume: string;
  quoteVolume: string;
}

export function mapBinanceTicker24h(row: BinanceTicker24hResponse): ITicker24h {
  return {
    symbol: row.symbol,
    lastPrice: parseFloat(row.lastPrice),
    openPrice: parseFloat(row.openPrice),
    highPrice: parseFloat(row.highPrice),
    lowPrice: parseFloat(row.lowPrice),
    priceChange: parseFloat(row.priceChange),
    priceChangePercent: parseFloat(row.priceChangePercent),
    volume: parseFloat(row.volume),
    quoteVolume: parseFloat(row.quoteVolume),
  };
}

/**
 * Binance 24hr mini-ticker stream payload.
 * https://developers.binance.com/docs/binance-spot-api-docs/web-socket-streams#individual-symbol-ticker-streams
 */
export interface BinanceTicker24hEvent {
  e: "24hrTicker";
  E: number;
  s: string;
  p: string;
  P: string;
  o: string;
  h: string;
  l: string;
  c: string;
  v: string;
  q: string;
}

export function mapBinanceTicker24hEvent(evt: BinanceTicker24hEvent): ITicker24h {
  return {
    symbol: evt.s,
    lastPrice: parseFloat(evt.c),
    openPrice: parseFloat(evt.o),
    highPrice: parseFloat(evt.h),
    lowPrice: parseFloat(evt.l),
    priceChange: parseFloat(evt.p),
    priceChangePercent: parseFloat(evt.P),
    volume: parseFloat(evt.v),
    quoteVolume: parseFloat(evt.q),
  };
}
