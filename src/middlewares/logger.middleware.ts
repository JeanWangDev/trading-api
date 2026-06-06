import type { Context, Next } from "koa";

/**
 * Lightweight request logger. Logs method, path, status, and duration
 * after the response is sent.
 */
export async function loggerMiddleware(ctx: Context, next: Next) {
  const start = performance.now();

  await next();

  const ms = (performance.now() - start).toFixed(1);
  const status = ctx.status;

  const level = status >= 500 ? "error" : status >= 400 ? "warn" : "info";
  const line = `${ctx.method} ${ctx.path} ${status} ${ms}ms`;

  if (level === "error") {
    console.error(`[http] ${line}`);
  } else if (level === "warn") {
    console.warn(`[http] ${line}`);
  } else {
    console.log(`[http] ${line}`);
  }
}

/**
 * Adds X-Response-Time header (complements logger).
 */
export async function responseTimeMiddleware(ctx: Context, next: Next) {
  const start = performance.now();
  await next();
  ctx.set("X-Response-Time", `${(performance.now() - start).toFixed(1)}ms`);
}
