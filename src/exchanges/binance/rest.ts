import { config } from "@/config";
import { fetchJson, fetchJsonWithRetry } from "@/utils/http-client";
import {
  intervalMillis,
  lookup as cacheLookup,
  saveClosedBars,
} from "@/utils/kline-cache";
import type {
  CanonicalInterval,
  IKline,
  ISymbolInfo,
  ISymbolSummary,
  ITicker24h,
} from "@/types/market";
import { createIntervalMapper } from "@/exchanges/intervals";
import type {
  IExchangeRest,
  IGetKlinesParams,
  ISearchSymbolsParams,
} from "@/exchanges/types";
import { mapBinanceKline, mapBinanceTicker24h, type BinanceKlineTuple, type BinanceTicker24hResponse } from "./mappers";

const EXCHANGE_ID = "binance";

const intervalMapper = createIntervalMapper({
  "1m": "1m",
  "3m": "3m",
  "5m": "5m",
  "15m": "15m",
  "30m": "30m",
  "1h": "1h",
  "2h": "2h",
  "4h": "4h",
  "6h": "6h",
  "8h": "8h",
  "12h": "12h",
  "1d": "1d",
  "3d": "3d",
  "1w": "1w",
  "1M": "1M",
});

export const binanceSupportedIntervals = intervalMapper.supported;

const BINANCE_KLINE_LIMIT = 1000;

interface BinanceExchangeInfoResponse {
  symbols: {
    symbol: string;
    status: string;
    baseAsset: string;
    quoteAsset: string;
    baseAssetPrecision: number;
    quoteAssetPrecision: number;
    isSpotTradingAllowed: boolean;
  }[];
}

let exchangeInfoCache: Promise<BinanceExchangeInfoResponse> | null = null;
let exchangeInfoCachedAt = 0;

const EXCHANGE_INFO_TTL_MS = 30 * 60 * 1000;

function getExchangeInfo(): Promise<BinanceExchangeInfoResponse> {
  const now = Date.now();

  if (!exchangeInfoCache || now - exchangeInfoCachedAt > EXCHANGE_INFO_TTL_MS) {
    exchangeInfoCachedAt = now;
    exchangeInfoCache = fetchJson<BinanceExchangeInfoResponse>(
      `${config.binanceRestBaseUrl}/api/v3/exchangeInfo`,
    ).catch((error) => {
      exchangeInfoCache = null;
      throw error;
    });
  }

  return exchangeInfoCache;
}

async function fetchKlineRange(
  symbol: string,
  interval: CanonicalInterval,
  startTime: number,
  endTime: number,
  limit: number,
): Promise<IKline[]> {
  const query = new URLSearchParams({
    symbol: symbol.toUpperCase(),
    interval: intervalMapper.toNative(interval),
    startTime: String(startTime),
    endTime: String(endTime),
    limit: String(Math.min(limit, BINANCE_KLINE_LIMIT)),
  });

  // `uiKlines` returns the same tuple shape as `klines` but with extra
  // chart-rendering smoothing (no gaps for empty intervals). It's the
  // endpoint Binance themselves use to power their own charts.
  const rows = await fetchJsonWithRetry<BinanceKlineTuple[]>(
    `${config.binanceRestBaseUrl}/api/v3/uiKlines?${query.toString()}`,
  );

  return rows.map(mapBinanceKline);
}

export const binanceRest: IExchangeRest = {
  async getServerTime() {
    const { serverTime } = await fetchJson<{ serverTime: number }>(
      `${config.binanceRestBaseUrl}/api/v3/time`,
    );

    return serverTime;
  },

  async getKlines(params: IGetKlinesParams): Promise<IKline[]> {
    const symbol = params.symbol.toUpperCase();
    const limit = Math.min(params.limit ?? 500, BINANCE_KLINE_LIMIT);

    // "Latest N bars" — only pass limit so Binance returns the most recent candles.
    if (params.startTime === undefined && params.endTime === undefined) {
      const query = new URLSearchParams({
        symbol,
        interval: intervalMapper.toNative(params.interval),
        limit: String(limit),
      });

      const rows = await fetchJsonWithRetry<BinanceKlineTuple[]>(
        `${config.binanceRestBaseUrl}/api/v3/uiKlines?${query.toString()}`,
      );

      const bars = rows.map(mapBinanceKline);

      saveClosedBars(EXCHANGE_ID, symbol, params.interval, bars, {
        dropUnclosed: true,
      });

      return bars;
    }

    // One-sided range: infer the missing bound from limit × interval.
    if (params.startTime === undefined || params.endTime === undefined) {
      const step = intervalMillis(params.interval);
      const endTime = params.endTime ?? Date.now();
      const startTime = params.startTime ?? Math.max(0, endTime - step * limit);

      const bars = await fetchKlineRange(
        symbol,
        params.interval,
        startTime,
        endTime,
        limit,
      );

      saveClosedBars(EXCHANGE_ID, symbol, params.interval, bars, {
        dropUnclosed: true,
      });

      return bars;
    }

    // Closed-bound range: lean on the kline cache and fetch only gaps.
    const { hits, misses } = cacheLookup(
      EXCHANGE_ID,
      symbol,
      params.interval,
      params.startTime,
      params.endTime,
    );

    if (misses.length === 0) {
      return hits.slice(0, limit);
    }

    const step = intervalMillis(params.interval);

    // Fetch the missing gaps in parallel; each gap is capped by the upstream
    // 1000-bar limit. We slice by step to avoid asking for too much.
    const fetched = await Promise.all(
      misses.map(({ startTime, endTime }) => {
        const bars = Math.min(
          Math.ceil((endTime - startTime) / step) + 1,
          BINANCE_KLINE_LIMIT,
        );

        return fetchKlineRange(symbol, params.interval, startTime, endTime, bars);
      }),
    );

    for (const batch of fetched) {
      saveClosedBars(EXCHANGE_ID, symbol, params.interval, batch, {
        dropUnclosed: true,
      });
    }

    const merged = [...hits, ...fetched.flat()];

    // Dedupe by openTime, then sort + slice to honour the caller's `limit`.
    const seen = new Set<number>();
    const deduped: IKline[] = [];

    for (const bar of merged) {
      if (!seen.has(bar.time)) {
        seen.add(bar.time);
        deduped.push(bar);
      }
    }

    deduped.sort((a, b) => a.time - b.time);

    return deduped.slice(0, limit);
  },

  async getTicker24h(symbol: string): Promise<ITicker24h> {
    const target = symbol.trim().toUpperCase();
    const row = await fetchJson<BinanceTicker24hResponse>(
      `${config.binanceRestBaseUrl}/api/v3/ticker/24hr?symbol=${encodeURIComponent(target)}`,
    );
    return mapBinanceTicker24h(row);
  },

  async searchSymbols(params: ISearchSymbolsParams): Promise<ISymbolSummary[]> {
    const query = params.query.trim().toUpperCase();
    const limit = params.limit ?? 30;

    const info = await getExchangeInfo();

    return info.symbols
      .filter(
        (symbol) =>
          symbol.status === "TRADING" &&
          symbol.isSpotTradingAllowed &&
          (!query || symbol.symbol.includes(query)),
      )
      .slice(0, limit)
      .map((symbol) => ({
        symbol: symbol.symbol,
        baseAsset: symbol.baseAsset,
        quoteAsset: symbol.quoteAsset,
        description: `${symbol.baseAsset}/${symbol.quoteAsset} Spot`,
      }));
  },

  async getSymbolInfo(symbol: string): Promise<ISymbolInfo> {
    const target = symbol.trim().toUpperCase();
    const info = await getExchangeInfo();
    const found = info.symbols.find((item) => item.symbol === target);

    if (!found) {
      throw new Error(`Binance symbol "${target}" not found.`);
    }

    return {
      symbol: found.symbol,
      baseAsset: found.baseAsset,
      quoteAsset: found.quoteAsset,
      description: `${found.baseAsset}/${found.quoteAsset} Spot`,
      pricePrecision: found.quoteAssetPrecision,
      quantityPrecision: found.baseAssetPrecision,
      supportedIntervals: binanceSupportedIntervals,
    };
  },
};
