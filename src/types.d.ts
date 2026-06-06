import "koa";
import type { AuthState, AuthUser } from "@/types/auth";

type ResponseOpts = {
  status?: number;
  message?: string;
  data?: unknown;
  code?: number;
  headers?: Record<string, string | string[]>;
  success?: boolean;
  details?: unknown;
};

declare module "koa" {
  interface DefaultState {
    user?: AuthUser;
    auth?: AuthState;
  }

  interface DefaultContext {
    sendResponse: (options: ResponseOpts) => unknown;
    sendSuccess: (
      data?: unknown,
      options?: Omit<ResponseOpts, "status" | "success">,
    ) => unknown;
    sendError: (message?: string, options?: ResponseOpts) => unknown;
  }
}
