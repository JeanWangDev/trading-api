import type { IncomingMessage } from "http";
import { WebSocketServer, type WebSocket } from "ws";
import { z } from "zod";
import { config } from "@/config";
import { EventService } from "@/services/events";
import { onEventCreated, type EventWsPayload } from "@/ws/events-bus";
import { rawDataToString } from "@/utils/ws-message";

const subscribeSchema = z.object({
  op: z.literal("subscribe"),
  channel: z.literal("feed"),
  id: z.string().optional(),
});

const pingSchema = z.object({
  op: z.literal("ping"),
  id: z.string().optional(),
});

const inboundSchema = z.union([subscribeSchema, pingSchema]);

const HEARTBEAT_INTERVAL_MS = 30_000;
const POLL_INTERVAL_MS = 45_000;

function safeSend(socket: WebSocket, payload: unknown) {
  if (socket.readyState !== socket.OPEN) return;
  try {
    socket.send(JSON.stringify(payload));
  } catch (error) {
    console.error("[events-hub] send failed", error);
  }
}

function broadcast(wss: WebSocketServer, payload: unknown, except?: WebSocket) {
  for (const client of wss.clients) {
    if (client === except || client.readyState !== client.OPEN) continue;
    safeSend(client, payload);
  }
}

export function createEventsWsServer(): WebSocketServer {
  const wss = new WebSocketServer({
    noServer: true,
    path: config.eventsWsPath,
  });

  let lastPollMs = Date.now() - 60_000;

  const pollNewEvents = async () => {
    try {
      const since = lastPollMs;
      lastPollMs = Date.now();
      const events = await EventService.listSince(since, 30);
      for (const event of events) {
        broadcast(wss, { type: "event", data: event });
      }
    } catch (error) {
      console.error("[events-hub] poll failed", error);
    }
  };

  const pollTimer = setInterval(() => {
    void pollNewEvents();
  }, POLL_INTERVAL_MS);

  const unsubscribeBus = onEventCreated((event: EventWsPayload) => {
    broadcast(wss, { type: "event", data: event });
  });

  wss.on("connection", (socket: WebSocket, request: IncomingMessage) => {
    safeSend(socket, {
      type: "hello",
      path: config.eventsWsPath,
      time: Date.now(),
    });

    const heartbeat = setInterval(() => {
      safeSend(socket, { type: "ping", time: Date.now() });
    }, HEARTBEAT_INTERVAL_MS);

    socket.on("message", (data) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(rawDataToString(data));
      } catch {
        safeSend(socket, { type: "error", message: "invalid JSON" });
        return;
      }

      const result = inboundSchema.safeParse(parsed);
      if (!result.success) {
        safeSend(socket, { type: "error", message: "unknown op" });
        return;
      }

      const msg = result.data;
      if (msg.op === "ping") {
        safeSend(socket, { type: "pong", id: msg.id, time: Date.now() });
        return;
      }

      if (msg.op === "subscribe" && msg.channel === "feed") {
        safeSend(socket, { type: "ack", op: "subscribe", channel: "feed", id: msg.id });
        void (async () => {
          const recent = await EventService.listRecent(15);
          safeSend(socket, { type: "snapshot", data: recent });
        })();
      }
    });

    socket.on("close", () => {
      clearInterval(heartbeat);
    });
  });

  wss.on("close", () => {
    clearInterval(pollTimer);
    unsubscribeBus();
  });

  return wss;
}
