/**
 * Typed application errors thrown from services/controllers.
 * The global error middleware maps these to the standard API envelope.
 */
export class AppError extends Error {
  readonly status: number;
  readonly code: number;
  readonly details?: unknown;

  constructor(
    status: number,
    message: string,
    options?: { code?: number; details?: unknown },
  ) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = options?.code ?? status;
    this.details = options?.details;
  }
}

export class BadRequestError extends AppError {
  constructor(message: string, details?: unknown) {
    super(400, message, { details });
    this.name = "BadRequestError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "未授权访问") {
    super(401, message);
    this.name = "UnauthorizedError";
  }
}

export class NotFoundError extends AppError {
  constructor(message = "资源未找到") {
    super(404, message);
    this.name = "NotFoundError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "无权访问") {
    super(403, message);
    this.name = "ForbiddenError";
  }
}

export class UpstreamServiceError extends AppError {
  constructor(message: string, details?: unknown) {
    super(502, message, { code: 502, details });
    this.name = "UpstreamServiceError";
  }
}
