import type { Context } from "koa";
import { ForbiddenError } from "@/errors/app-error";
import type { AuthUser } from "@/types/auth";
import { requireAuthUser } from "@/middlewares/auth.middleware";

const ADMIN_ROLE_KEYS = new Set(["admin", "super_admin"]);

/** 仅 admin / super_admin 可访问后台管理接口 */
export function requireAdmin(ctx: Context): AuthUser {
  const user = requireAuthUser(ctx);

  if (!user.roleKey || !ADMIN_ROLE_KEYS.has(user.roleKey)) {
    throw new ForbiddenError("需要管理员权限");
  }

  return user;
}
