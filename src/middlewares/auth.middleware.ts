import type { Context, Next } from "koa";
import { config } from "@/config";
import { UnauthorizedError } from "@/errors/app-error";
import type { AuthState, AuthUser } from "@/types/auth";
import { decodeAccessTokenUnsafe, verifyAccessToken } from "@/utils/jwt";

const PUBLIC_AUTH_ROUTES = new Set([
  "GET /api/v1/auth/roles",
  "POST /api/v1/auth/send-code",
  "POST /api/v1/auth/register",
  "POST /api/v1/auth/login",
  "POST /api/v1/auth/forgot-password",
  "POST /api/v1/auth/reset-password",
  "GET /api/v1/events/list",
  "GET /api/v1/events/chart",
  "GET /api/v1/events/recent",
  "GET /api/v1/events/:id",
  "GET /api/v1/chart-templates/public",
  "GET /api/v1/chart-templates/rankings",
  "GET /api/v1/chart-templates/starter",
  "GET /api/v1/chart-templates/detail",
  "POST /api/v1/chart-templates/track",
  "GET /api/v1/billing/plans",
]);

function isAuthExempt(ctx: Context): boolean {
  const routeKey = `${ctx.method} ${ctx.path}`;

  if (PUBLIC_AUTH_ROUTES.has(routeKey)) {
    return true;
  }

  return config.authSkipPaths.some(
    (prefix) => ctx.path === prefix || ctx.path.startsWith(`${prefix}/`),
  );
}

function extractBearerToken(ctx: Context): string | undefined {
  const header = ctx.get("authorization");
  if (!header.startsWith("Bearer ")) {
    return undefined;
  }
  return header.slice(7).trim() || undefined;
}

function attachDevBypassUser(ctx: Context, token: string) {
  const decoded = decodeAccessTokenUnsafe(token);
  ctx.state.user = decoded ?? { id: "dev" };
  ctx.state.auth = { tokenPresent: true, devBypass: true };
}

/** WebSocket 升级与普通 HTTP 均不应走 JWT（由 ws 子系统处理） */
function isWebSocketPath(ctx: Context): boolean {
  if (ctx.path === "/ws/market" || ctx.path === "/ws/events") {
    return true;
  }
  if (ctx.path.startsWith("/ws/")) {
    return true;
  }
  const upgrade = ctx.get("upgrade");
  return upgrade.toLowerCase() === "websocket";
}

/** Bearer JWT gate for protected business routes. */
export async function authMiddleware(ctx: Context, next: Next) {
  if (isWebSocketPath(ctx) || isAuthExempt(ctx)) {
    await next();
    return;
  }

  const token = extractBearerToken(ctx);

  if (!token) {
    throw new UnauthorizedError("登录状态已失效，请重新登录");
  }

  if (!config.jwtSecret) {
    if (config.isProd) {
      throw new UnauthorizedError("服务端鉴权未配置");
    }

    attachDevBypassUser(ctx, token);
    await next();
    return;
  }

  const user: AuthUser = verifyAccessToken(token);
  const auth: AuthState = { tokenPresent: true, verified: true };
  ctx.state.user = user;
  ctx.state.auth = auth;

  await next();
}

export function requireAuthUser(ctx: Context): AuthUser {
  if (!ctx.state.user) {
    throw new UnauthorizedError("登录状态已失效，请重新登录");
  }

  return ctx.state.user;
}
