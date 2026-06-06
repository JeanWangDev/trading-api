import type { Context } from "koa";

interface ResponseOptions {
  /** HTTP status — business APIs default to 200 (demo-server style). */
  status?: number;
  message?: string;
  data?: unknown;
  /** Business code in JSON body (401, 400, 404, …). */
  code?: number;
  headers?: Record<string, string | string[]>;
  success?: boolean;
  details?: unknown;
}

interface ApiResponse {
  code: number;
  success: boolean;
  message: string;
  data?: unknown;
  details?: unknown;
  timestamp: number;
}

function sendResponse(ctx: Context, options: ResponseOptions): ApiResponse {
  const { status = 200, message, data, code, headers, success, details } = options;

  const isSuccessful = status >= 200 && status < 300;
  const operationSuccess = typeof success === "boolean" ? success : isSuccessful;
  const responseCode = code ?? status;

  const responseBody: ApiResponse = {
    code: responseCode,
    success: operationSuccess,
    message: message || (operationSuccess ? "ok" : "操作失败"),
    timestamp: Date.now(),
  };

  if (data !== undefined) {
    responseBody.data = data;
  }

  if (details !== undefined) {
    responseBody.details = details;
  }

  ctx.status = status;

  if (headers) {
    for (const [key, value] of Object.entries(headers)) {
      ctx.set(key, value);
    }
  }

  ctx.body = responseBody;
  return responseBody;
}

export function sendSuccess(
  ctx: Context,
  data?: unknown,
  options: Omit<ResponseOptions, "status" | "success"> = {},
): ApiResponse {
  return sendResponse(ctx, {
    ...options,
    status: 200,
    code: options.code ?? 200,
    message: options.message || "ok",
    data,
    success: true,
  });
}

/**
 * Business error envelope — HTTP 200 by default, real status in `code` (demo-server).
 */
export function sendError(
  ctx: Context,
  message?: string,
  options: ResponseOptions = {},
): ApiResponse {
  const businessCode = options.code ?? 500;

  return sendResponse(ctx, {
    ...options,
    status: options.status ?? 200,
    code: businessCode,
    message: message || "服务器错误",
    success: false,
    data: options.data ?? null,
  });
}

export default {
  sendResponse,
  sendSuccess,
  sendError,
};
