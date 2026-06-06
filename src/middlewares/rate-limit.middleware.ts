import type { Context, Next } from "koa";
import { config } from "@/config";

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}, 5 * 60_000).unref();

function clientKey(ctx: Context): string {
  const forwarded = ctx.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return ctx.ip;
}

/** In-memory token bucket per IP for /api/v1/market/* endpoints. */
export async function marketRateLimitMiddleware(ctx: Context, next: Next) {
  if (!ctx.path.startsWith("/api/v1/market")) {
    await next();
    return;
  }

  const key = clientKey(ctx);
  const limit = config.marketRateLimitPerMin;
  const now = Date.now();
  const windowMs = 60_000;

  let bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }

  bucket.count += 1;

  const remaining = Math.max(0, limit - bucket.count);
  ctx.set("X-RateLimit-Limit", String(limit));
  ctx.set("X-RateLimit-Remaining", String(remaining));

  if (bucket.count > limit) {
    ctx.sendError("请求过于频繁，请稍后再试", {
      status: 200,
      code: 429,
      data: null,
    });
    return;
  }

  await next();
}
