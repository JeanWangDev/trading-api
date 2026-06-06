import type { Server as HttpServer, IncomingMessage } from "http";
import type { WebSocketServer } from "ws";

type WsRoute = {
  path: string;
  wss: WebSocketServer;
  /** 返回 false 时拒绝升级（HTTP 401） */
  verifyUpgrade?: (request: IncomingMessage) => boolean;
};

function rejectUpgrade(
  socket: { write: (chunk: string) => boolean; destroy: () => void },
  status = 401,
) {
  const body = status === 401 ? "Unauthorized" : "Forbidden";
  socket.write(
    `HTTP/1.1 ${status} ${body}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`,
  );
  socket.destroy();
}

/**
 * 同一 http.Server 上挂多个 WebSocketServer 时，不能都用 `server` + `path` 选项，
 * 否则先注册的实例会对不匹配 path 的请求 abortHandshake(400)。
 */
export function attachWsUpgradeRouter(httpServer: HttpServer, routes: WsRoute[]): void {
  httpServer.on("upgrade", (request, socket, head) => {
    const rawUrl = request.url ?? "/";
    const q = rawUrl.indexOf("?");
    const pathname = q === -1 ? rawUrl : rawUrl.slice(0, q);

    const route = routes.find((r) => r.path === pathname);
    if (!route) {
      socket.destroy();
      return;
    }

    if (route.verifyUpgrade && !route.verifyUpgrade(request)) {
      rejectUpgrade(socket, 401);
      return;
    }

    route.wss.handleUpgrade(request, socket, head, (ws) => {
      route.wss.emit("connection", ws, request as IncomingMessage);
    });
  });
}
