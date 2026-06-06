import type { IKline } from "@/types/market";

const MAX_ENTRIES = 200_000;

type CacheKey = string;

function makeKey(
  exchange: string,
  symbol: string,
  interval: string,
  openTime: number,
): CacheKey {
  return `${exchange}|${symbol}|${interval}|${openTime}`;
}

const store = new Map<CacheKey, IKline>();

function touch(key: CacheKey, bar: IKline) {
  if (store.has(key)) {
    store.delete(key);
  } else if (store.size >= MAX_ENTRIES) {
    const oldestKey = store.keys().next().value;
    if (oldestKey !== undefined) {
      store.delete(oldestKey);
    }
  }

  store.set(key, bar);
}

export interface CacheLookupResult {
  hits: IKline[];
  misses: { startTime: number; endTime: number }[];
}

const INTERVAL_TO_MS: Record<string, number> = {
  "1m": 60_000,
  "3m": 3 * 60_000,
  "5m": 5 * 60_000,
  "15m": 15 * 60_000,
  "30m": 30 * 60_000,
  "1h": 60 * 60_000,
  "2h": 2 * 60 * 60_000,
  "4h": 4 * 60 * 60_000,
  "6h": 6 * 60 * 60_000,
  "8h": 8 * 60 * 60_000,
  "12h": 12 * 60 * 60_000,
  "1d": 24 * 60 * 60_000,
  "3d": 3 * 24 * 60 * 60_000,
  "1w": 7 * 24 * 60 * 60_000,
  "1M": 28 * 24 * 60 * 60_000,
};

export function intervalMillis(interval: string): number {
  return INTERVAL_TO_MS[interval] ?? 60_000;
}

export function lookup(
  exchange: string,
  symbol: string,
  interval: string,
  startTime: number,
  endTime: number,
): CacheLookupResult {
  if (startTime > endTime) {
    return { hits: [], misses: [] };
  }

  const step = INTERVAL_TO_MS[interval] ?? 60_000;
  const firstOpen = Math.floor(startTime / step) * step;
  const lastOpen = Math.floor(endTime / step) * step;

  const hits: IKline[] = [];
  const misses: { startTime: number; endTime: number }[] = [];

  let gapStart: number | null = null;

  for (let openTime = firstOpen; openTime <= lastOpen; openTime += step) {
    const bar = store.get(makeKey(exchange, symbol, interval, openTime));

    if (bar) {
      touch(makeKey(exchange, symbol, interval, openTime), bar);
      hits.push(bar);

      if (gapStart !== null) {
        misses.push({ startTime: gapStart, endTime: openTime - 1 });
        gapStart = null;
      }
    } else if (gapStart === null) {
      gapStart = openTime;
    }
  }

  if (gapStart !== null) {
    misses.push({ startTime: gapStart, endTime });
  }

  return { hits, misses };
}

export function saveClosedBars(
  exchange: string,
  symbol: string,
  interval: string,
  bars: IKline[],
  options?: { dropUnclosed?: boolean },
) {
  if (bars.length === 0) return;

  const step = INTERVAL_TO_MS[interval] ?? 60_000;
  const now = Date.now();

  const limit = options?.dropUnclosed
    ? bars.findIndex((bar) => bar.time + step > now)
    : -1;

  const upperExclusive = limit === -1 ? bars.length : limit;

  for (let i = 0; i < upperExclusive; i += 1) {
    const bar = bars[i];
    if (!bar) continue;
    touch(makeKey(exchange, symbol, interval, bar.time), bar);
  }
}
