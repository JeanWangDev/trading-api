import type { Context } from "koa";
import { config } from "@/config";
import type { AuthUser } from "@/types/auth";
import { decodeAccessTokenUnsafe, verifyAccessToken } from "@/utils/jwt";

function extractBearerToken(ctx: Context): string | undefined {
  const header = ctx.get("authorization");
  if (!header.startsWith("Bearer ")) return undefined;
  return header.slice(7).trim() || undefined;
}

/** 有 token 则解析用户，无 token 或无效则返回 null（不抛错） */
export function optionalAuthUser(ctx: Context): AuthUser | null {
  const token = extractBearerToken(ctx);
  if (!token) return null;

  if (!config.jwtSecret) {
    if (config.isProd) return null;
    return decodeAccessTokenUnsafe(token);
  }

  try {
    return verifyAccessToken(token);
  } catch {
    return null;
  }
}
