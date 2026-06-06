import type { Context, Next } from "koa";
import { AppError } from "@/errors/app-error";
import { ExchangeNotFoundError } from "@/exchanges/registry";
import { UpstreamError } from "@/utils/http-client";

/**
 * Maps thrown errors to the standard API envelope.
 * Business errors use HTTP 200 + body.code (demo-server style).
 */
export async function errorMiddleware(ctx: Context, next: Next) {
  try {
    await next();
  } catch (error: unknown) {
    if (error instanceof AppError) {
      ctx.sendError(error.message, {
        status: 200,
        code: error.code,
        details: error.details,
        data: null,
      });
      return;
    }

    if (error instanceof ExchangeNotFoundError) {
      ctx.sendError(error.message, {
        status: 200,
        code: error.status,
        data: null,
      });
      return;
    }

    if (error instanceof UpstreamError) {
      ctx.sendError(error.message, {
        status: 200,
        code: 502,
        data: null,
      });
      return;
    }

    const message = error instanceof Error ? error.message : "Internal Server Error";

    console.error("[error]", error);

    ctx.sendError(message, {
      status: 200,
      code: 500,
      data: null,
    });
  }
}
