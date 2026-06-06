import type { Context, Next } from "koa";
import { config } from "@/config";
import responseHelper from "@/utils/apiResponse";

/**
 * Inject `ctx.sendSuccess / ctx.sendError / ctx.sendResponse` on every
 * request so controllers never hand-build `{ success, data }` envelopes.
 */
export async function apiResponseMiddleware(ctx: Context, next: Next) {
  ctx.sendResponse = (options) => responseHelper.sendResponse(ctx, options);
  ctx.sendSuccess = (data, options) => responseHelper.sendSuccess(ctx, data, options);
  ctx.sendError = (message, options) => responseHelper.sendError(ctx, message, options);

  await next();
}

/** CORS with configurable origin whitelist + localhost regex patterns. */
export async function accessOriginMiddleware(ctx: Context, next: Next) {
  const origin = ctx.request.header.origin ?? "";
  const allowed = config.clientOrigins;

  const originRegexPatterns = [
    /^https?:\/\/localhost(:\d+)?$/,
    /^https?:\/\/127\.0\.0\.1(:\d+)?$/,
  ];

  const isAllowed =
    !origin ||
    allowed.includes(origin) ||
    originRegexPatterns.some((regex) => regex.test(origin));

  if (isAllowed && origin) {
    ctx.set("Access-Control-Allow-Origin", origin);
    ctx.set("Access-Control-Allow-Credentials", "true");
  }

  ctx.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  ctx.set(
    "Access-Control-Allow-Headers",
    [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "X-Timestamp",
      "X-Nonce",
      "X-Signature",
    ].join(", "),
  );
  ctx.set(
    "Access-Control-Expose-Headers",
    ["X-Response-Time", "X-RateLimit-Remaining"].join(", "),
  );
  ctx.set("Access-Control-Max-Age", "86400");

  if (ctx.method === "OPTIONS") {
    ctx.status = 204;
    return;
  }

  await next();
}
