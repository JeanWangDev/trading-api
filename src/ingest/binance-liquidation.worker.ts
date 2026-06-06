import WebSocket from "ws";
import { randomUUID } from "crypto";
import { EventService } from "@/services/events";
import { resolvePrimarySymbol } from "@/utils/event-symbols";

const FSTREAM_WS = "wss://fstream.binance.com/ws/!forceOrder@arr";

let socket: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

type ForceOrderMsg = {
  e?: string;
  o?: {
    s?: string;
    S?: string;
    q?: string;
    p?: string;
    T?: number;
    X?: string;
  };
};

async function handleLiquidation(order: NonNullable<ForceOrderMsg["o"]>) {
  const primary = resolvePrimarySymbol(order.s);
  if (!primary) return;

  const side = order.S === "SELL" ? "long" : "short";
  const qty = order.q ?? "?";
  const price = order.p ?? "?";
  const publishedAt = order.T ?? Date.now();
  const externalId = `liq:${order.s}:${publishedAt}:${order.q}`;

  const pair = (order.s ?? `${primary}USDT`).toUpperCase();
  const title = `${primary} ${side === "long" ? "多头" : "空头"}爆仓 ${qty} @ ${price}`;
  const description = `Binance 合约强平：${pair} ${order.S} ${qty}，价格 ${price}`;

  await EventService.upsert({
    eventId: randomUUID(),
    source: "binance_liquidation",
    externalId,
    type: "liquidation",
    title,
    description,
    url: `https://www.binance.com/en/futures/${pair}`,
    symbols: [primary],
    sentiment: side === "long" ? "bearish" : "bullish",
    impact: 55,
    publishedAt,
  });
}

function connect() {
  if (socket) {
    socket.removeAllListeners();
    socket.close();
  }

  socket = new WebSocket(FSTREAM_WS);

  socket.on("open", () => {
    console.log("[liquidation-worker] connected to Binance forceOrder stream");
  });

  socket.on("message", (raw) => {
    try {
      const payload = JSON.parse(String(raw)) as ForceOrderMsg;
      if (payload.o) {
        void handleLiquidation(payload.o);
      }
    } catch {
      // ignore malformed
    }
  });

  socket.on("close", () => {
    scheduleReconnect();
  });

  socket.on("error", () => {
    scheduleReconnect();
  });
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, 5_000);
}

export function startBinanceLiquidationWorker(): void {
  connect();
}

export function stopBinanceLiquidationWorker(): void {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (socket) {
    socket.removeAllListeners();
    socket.close();
    socket = null;
  }
}
