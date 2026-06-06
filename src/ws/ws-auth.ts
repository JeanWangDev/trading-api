import type { IncomingMessage } from "http";
import { config } from "@/config";
import { verifyAccessToken } from "@/utils/jwt";

function tokenFromUpgradeUrl(request: IncomingMessage): string | undefined {
  const raw = request.url ?? "";
  const q = raw.indexOf("?");
  if (q === -1) return undefined;
  const params = new URLSearchParams(raw.slice(q + 1));
  const token = params.get("token")?.trim();
  return token || undefined;
}

function tokenFromSecProtocol(request: IncomingMessage): string | undefined {
  const header = request.headers["sec-websocket-protocol"];
  if (!header || typeof header !== "string") return undefined;
  const parts = header.split(",").map((s) => s.trim());
  const bearer = parts.find((p) => p.startsWith("bearer."));
  if (!bearer) return undefined;
  return bearer.slice("bearer.".length) || undefined;
}

export function extractWsToken(request: IncomingMessage): string | undefined {
  return tokenFromUpgradeUrl(request) ?? tokenFromSecProtocol(request);
}

/**
 * 事件流 WS 鉴权：默认公开（与 GET /events 一致，只读 RSS 聚合）。
 * 设置 EVENTS_WS_REQUIRE_AUTH=true 后必须在握手时带 ?token= 或 Sec-WebSocket-Protocol: bearer.xxx
 */
export function verifyEventsWsUpgrade(request: IncomingMessage): boolean {
  if (!config.eventsWsRequireAuth) {
    return true;
  }

  const token = extractWsToken(request);
  if (!token) {
    return false;
  }

  if (!config.jwtSecret) {
    return config.isDev;
  }

  try {
    verifyAccessToken(token);
    return true;
  } catch {
    return false;
  }
}
