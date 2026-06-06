import type { IncomingMessage } from "http";
import { WebSocketServer, type WebSocket } from "ws";
import { z } from "zod";
import { config } from "@/config";
import { isCanonicalInterval } from "@/exchanges/intervals";
import { getExchange } from "@/exchanges/registry";
import type { IStreamHandle } from "@/exchanges/types";
import { CANONICAL_INTERVALS } from "@/types/market";
import { rawDataToString } from "@/utils/ws-message";

/**
 * Wire protocol (client → server)
 * ───────────────────────────────────────────────────────────────────────────
 *   { op: "subscribe",   channel: "kline",    exchange?, symbol, interval, id? }
 *   { op: "subscribe",   channel: "aggTrade", exchange?, symbol,          id? }
 *   { op: "subscribe",   channel: "ticker",   exchange?, symbol,          id? }
 *   { op: "unsubscribe", subscriptionId, id? }
 *   { op: "ping",                                                          id? }
 *
 * Wire protocol (server → client)
 * ───────────────────────────────────────────────────────────────────────────
 *   { type: "hello", path, time }
 *   { type: "ack",   op, id?, subscriptionId, ... }
 *   { type: "kline", subscriptionId, exchange, symbol, interval, data }
 *   { type: "trade", subscriptionId, exchange, symbol,           data }
 *   { type: "ticker", subscriptionId, exchange, symbol,          data }
 *   { type: "error", op?, id?, message }
 *   { type: "pong",  id? }
 *
 * The hub is exchange-agnostic — it dispatches subscribe ops to whatever
 * adapter the registry resolves.
 */

const subscribeKlineSchema = z.object({
  op: z.literal("subscribe"),
  channel: z.literal("kline"),
  exchange: z.string().optional(),
  symbol: z.string().min(1),
  interval: z.string().refine(isCanonicalInterval, {
    message: `interval must be one of: ${CANONICAL_INTERVALS.join(", ")}`,
  }),
  id: z.string().optional(),
});

const subscribeTradesSchema = z.object({
  op: z.literal("subscribe"),
  channel: z.literal("aggTrade"),
  exchange: z.string().optional(),
  symbol: z.string().min(1),
  id: z.string().optional(),
});

const subscribeTickerSchema = z.object({
  op: z.literal("subscribe"),
  channel: z.literal("ticker"),
  exchange: z.string().optional(),
  symbol: z.string().min(1),
  id: z.string().optional(),
});

const subscribeSchema = z.discriminatedUnion("channel", [
  subscribeKlineSchema,
  subscribeTradesSchema,
  subscribeTickerSchema,
]);

const unsubscribeSchema = z.object({
  op: z.literal("unsubscribe"),
  subscriptionId: z.string().min(1),
  id: z.string().optional(),
});

const pingSchema = z.object({
  op: z.literal("ping"),
  id: z.string().optional(),
});

const inboundSchema = z.union([subscribeSchema, unsubscribeSchema, pingSchema]);

interface ClientSubscription {
  channel: "kline" | "aggTrade" | "ticker";
  exchange: string;
  symbol: string;
  interval?: string;
  handle: IStreamHandle;
}

const HEARTBEAT_INTERVAL_MS = 30_000;

let subscriptionCounter = 0;
function nextSubscriptionId(): string {
  subscriptionCounter += 1;
  return `sub_${Date.now().toString(36)}_${subscriptionCounter}`;
}

function safeSend(socket: WebSocket, payload: unknown) {
  if (socket.readyState !== socket.OPEN) {
    return;
  }

  try {
    socket.send(JSON.stringify(payload));
  } catch (error) {
    console.error("[market-hub] send failed", error);
  }
}

export function createMarketWsServer(): WebSocketServer {
  const wss = new WebSocketServer({
    noServer: true,
    path: config.marketWsPath,
  });

  wss.on("connection", (socket: WebSocket, request: IncomingMessage) => {
    const subscriptions = new Map<string, ClientSubscription>();
    let isAlive = true;

    socket.on("pong", () => {
      isAlive = true;
    });

    const heartbeat = setInterval(() => {
      if (!isAlive) {
        socket.terminate();
        return;
      }

      isAlive = false;
      try {
        socket.ping();
      } catch {
        /* noop */
      }
    }, HEARTBEAT_INTERVAL_MS);

    const cleanup = () => {
      clearInterval(heartbeat);
      for (const sub of subscriptions.values()) {
        sub.handle.close();
      }
      subscriptions.clear();
    };

    socket.on("close", cleanup);
    socket.on("error", (error) => {
      console.error("[market-hub] client error", error);
      cleanup();
    });

    socket.on("message", (raw) => {
      let parsed: z.infer<typeof inboundSchema>;

      try {
        const json = JSON.parse(rawDataToString(raw));
        parsed = inboundSchema.parse(json);
      } catch (error) {
        safeSend(socket, {
          type: "error",
          message:
            error instanceof Error ? error.message : "Malformed message payload.",
        });
        return;
      }

      if (parsed.op === "ping") {
        safeSend(socket, { type: "pong", id: parsed.id });
        return;
      }

      if (parsed.op === "unsubscribe") {
        const sub = subscriptions.get(parsed.subscriptionId);

        if (!sub) {
          safeSend(socket, {
            type: "error",
            op: "unsubscribe",
            id: parsed.id,
            message: `Unknown subscription "${parsed.subscriptionId}".`,
          });
          return;
        }

        sub.handle.close();
        subscriptions.delete(parsed.subscriptionId);

        safeSend(socket, {
          type: "ack",
          op: "unsubscribe",
          id: parsed.id,
          subscriptionId: parsed.subscriptionId,
        });
        return;
      }

      // parsed.op === "subscribe"
      try {
        const adapter = getExchange(parsed.exchange);
        const subscriptionId = nextSubscriptionId();
        const symbol = parsed.symbol.toUpperCase();

        if (parsed.channel === "kline") {
          const handle = adapter.ws.subscribeKline(
            symbol,
            parsed.interval as never,
            (tick) => {
              safeSend(socket, {
                type: "kline",
                subscriptionId,
                exchange: adapter.meta.id,
                symbol,
                interval: parsed.interval,
                data: tick,
              });
            },
          );

          subscriptions.set(subscriptionId, {
            channel: "kline",
            exchange: adapter.meta.id,
            symbol,
            interval: parsed.interval,
            handle,
          });

          safeSend(socket, {
            type: "ack",
            op: "subscribe",
            channel: "kline",
            id: parsed.id,
            subscriptionId,
            exchange: adapter.meta.id,
            symbol,
            interval: parsed.interval,
          });
          return;
        }

        if (parsed.channel === "aggTrade") {
          const handle = adapter.ws.subscribeTrades(symbol, (trade) => {
            safeSend(socket, {
              type: "trade",
              subscriptionId,
              exchange: adapter.meta.id,
              symbol,
              data: trade,
            });
          });

          subscriptions.set(subscriptionId, {
            channel: "aggTrade",
            exchange: adapter.meta.id,
            symbol,
            handle,
          });

          safeSend(socket, {
            type: "ack",
            op: "subscribe",
            channel: "aggTrade",
            id: parsed.id,
            subscriptionId,
            exchange: adapter.meta.id,
            symbol,
          });
          return;
        }

        // parsed.channel === "ticker"
        const handle = adapter.ws.subscribeTicker(symbol, (ticker) => {
          safeSend(socket, {
            type: "ticker",
            subscriptionId,
            exchange: adapter.meta.id,
            symbol,
            data: ticker,
          });
        });

        subscriptions.set(subscriptionId, {
          channel: "ticker",
          exchange: adapter.meta.id,
          symbol,
          handle,
        });

        safeSend(socket, {
          type: "ack",
          op: "subscribe",
          channel: "ticker",
          id: parsed.id,
          subscriptionId,
          exchange: adapter.meta.id,
          symbol,
        });
      } catch (error) {
        safeSend(socket, {
          type: "error",
          op: "subscribe",
          id: parsed.id,
          message: error instanceof Error ? error.message : "Subscription failed.",
        });
      }
    });

    safeSend(socket, {
      type: "hello",
      path: config.marketWsPath,
      time: Date.now(),
    });

    const origin = request.headers.origin ?? "unknown";
    console.log(`[market-hub] connected from ${origin}`);
  });

  return wss;
}
