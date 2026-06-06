import WebSocket from "ws";
import { config } from "@/config";
import type { CanonicalInterval } from "@/types/market";
import { createIntervalMapper } from "@/exchanges/intervals";
import type {
  IExchangeWs,
  IStreamHandle,
  KlineStreamHandler,
  TickerStreamHandler,
  TradeStreamHandler,
} from "@/exchanges/types";
import {
  mapBinanceAggTrade,
  mapBinanceKlineEvent,
  mapBinanceTicker24hEvent,
  type BinanceAggTradeEvent,
  type BinanceKlineEvent,
  type BinanceTicker24hEvent,
} from "./mappers";
import { rawDataToString } from "@/utils/ws-message";

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

// ─── Generic upstream multiplexer ─────────────────────────────────────────────
//
// One upstream WebSocket per raw stream key (e.g. `btcusdt@kline_1h` /
// `btcusdt@aggTrade`), shared across every logical subscriber in the process.
// Connections auto-reconnect with exponential backoff and tear down only when
// the last subscriber leaves.
//
// `handlers` is intentionally `Set<(evt: unknown) => void>` so the same pool
// can carry any Binance stream type — channel-specific decoding happens
// inside the handler the caller registers.
//

type UntypedHandler = (event: unknown) => void;

interface PoolEntry {
  socket: WebSocket;
  handlers: Set<UntypedHandler>;
  reconnectAttempts: number;
  reconnectTimer: NodeJS.Timeout | null;
  closed: boolean;
}

const pool = new Map<string, PoolEntry>();

/** Tear down a socket without triggering process-level unhandled `error`. */
function shutdownSocket(socket: WebSocket) {
  socket.removeAllListeners("message");
  socket.removeAllListeners("open");
  socket.removeAllListeners("close");
  socket.removeAllListeners("error");
  socket.on("error", () => {
    /* swallow close-before-open / terminate races */
  });

  const state = socket.readyState;

  if (state === WebSocket.CONNECTING) {
    try {
      socket.terminate();
    } catch {
      /* noop */
    }
    return;
  }

  if (state === WebSocket.OPEN || state === WebSocket.CLOSING) {
    try {
      socket.close();
    } catch {
      try {
        socket.terminate();
      } catch {
        /* noop */
      }
    }
  }
}

function safeCloseUpstreamSocket(socket: WebSocket) {
  shutdownSocket(socket);
}

function teardownPoolEntry(streamKey: string, entry: PoolEntry) {
  entry.closed = true;

  if (entry.reconnectTimer) {
    clearTimeout(entry.reconnectTimer);
    entry.reconnectTimer = null;
  }

  const socket = entry.socket;
  if (socket) {
    shutdownSocket(socket);
  }

  pool.delete(streamKey);
}

function openUpstream(streamKey: string, entry: PoolEntry) {
  const url = `${config.binanceWsBaseUrl}/ws/${streamKey}`;
  const socket = new WebSocket(url);
  entry.socket = socket;

  socket.on("message", (raw: WebSocket.RawData) => {
    let payload: unknown;
    try {
      payload = JSON.parse(rawDataToString(raw));
    } catch (error) {
      console.error(`[binance:ws] ${streamKey} malformed`, error);
      return;
    }

    for (const handler of entry.handlers) {
      try {
        handler(payload);
      } catch (error) {
        console.error(`[binance:ws] ${streamKey} handler threw`, error);
      }
    }
  });

  socket.on("open", () => {
    if (entry.closed || entry.handlers.size === 0) {
      shutdownSocket(socket);
      return;
    }

    entry.reconnectAttempts = 0;
  });

  const scheduleReconnect = () => {
    if (entry.closed || entry.handlers.size === 0) {
      return;
    }

    const delay = Math.min(30_000, 500 * 2 ** entry.reconnectAttempts);
    entry.reconnectAttempts += 1;
    entry.reconnectTimer = setTimeout(() => {
      entry.reconnectTimer = null;
      openUpstream(streamKey, entry);
    }, delay);
  };

  socket.on("close", scheduleReconnect);
  socket.on("error", (error) => {
    if (entry.closed) {
      return;
    }

    console.error(`[binance:ws] ${streamKey} error`, error);
    safeCloseUpstreamSocket(socket);
  });
}

function attachUpstream(streamKey: string, handler: UntypedHandler): IStreamHandle {
  let entry = pool.get(streamKey);

  if (!entry) {
    entry = {
      socket: null as unknown as WebSocket,
      handlers: new Set(),
      reconnectAttempts: 0,
      reconnectTimer: null,
      closed: false,
    };
    pool.set(streamKey, entry);
    openUpstream(streamKey, entry);
  }

  entry.handlers.add(handler);

  return {
    close: () => {
      const current = pool.get(streamKey);
      if (!current) return;

      current.handlers.delete(handler);

      if (current.handlers.size === 0) {
        teardownPoolEntry(streamKey, current);
      }
    },
  };
}

// ─── Public adapter surface ──────────────────────────────────────────────────

function klineStreamKey(symbol: string, interval: CanonicalInterval): string {
  return `${symbol.toLowerCase()}@kline_${intervalMapper.toNative(interval)}`;
}

function aggTradeStreamKey(symbol: string): string {
  return `${symbol.toLowerCase()}@aggTrade`;
}

function tickerStreamKey(symbol: string): string {
  return `${symbol.toLowerCase()}@ticker`;
}

export const binanceWs: IExchangeWs = {
  subscribeKline(
    symbol: string,
    interval: CanonicalInterval,
    onTick: KlineStreamHandler,
  ): IStreamHandle {
    return attachUpstream(klineStreamKey(symbol, interval), (event) => {
      const evt = event as BinanceKlineEvent;
      if (evt?.e !== "kline" || !evt.k) return;
      onTick(mapBinanceKlineEvent(evt));
    });
  },

  subscribeTrades(symbol: string, onTrade: TradeStreamHandler): IStreamHandle {
    return attachUpstream(aggTradeStreamKey(symbol), (event) => {
      const evt = event as BinanceAggTradeEvent;
      if (evt?.e !== "aggTrade") return;
      onTrade(mapBinanceAggTrade(evt));
    });
  },

  subscribeTicker(symbol: string, onTicker: TickerStreamHandler): IStreamHandle {
    return attachUpstream(tickerStreamKey(symbol), (event) => {
      const evt = event as BinanceTicker24hEvent;
      if (evt?.e !== "24hrTicker") return;
      onTicker(mapBinanceTicker24hEvent(evt));
    });
  },
};
