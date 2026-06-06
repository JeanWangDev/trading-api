import type { Context } from "koa";
import { toAdminUserDto } from "@/dto/admin";
import { BadRequestError } from "@/errors/app-error";
import { requireAdmin } from "@/middlewares/require-admin.middleware";
import { AdminUserService } from "@/services/admin/admin-user.service";
import { formatZodError } from "@/validators/common/parse";
import {
  createAdminUserBodySchema,
  listAdminUsersQuerySchema,
  updateAdminUserRoleBodySchema,
  updateAdminUserStatusBodySchema,
} from "@/validators/admin";

function actorId(ctx: Context): number {
  const user = requireAdmin(ctx);
  const id = Number(user.id);
  if (!Number.isFinite(id) || id <= 0) {
    throw new BadRequestError("无效的管理员身份");
  }
  return id;
}

export class AdminUserController {
  static async listRoles(ctx: Context) {
    requireAdmin(ctx);
    const roles = await AdminUserService.listRoles();
    ctx.sendSuccess({ data: roles });
  }

  static async list(ctx: Context) {
    requireAdmin(ctx);
    const parsed = listAdminUsersQuerySchema.safeParse(ctx.query);
    if (!parsed.success) {
      throw new BadRequestError(formatZodError(parsed.error));
    }

    const result = await AdminUserService.list(parsed.data);
    ctx.sendSuccess({
      data: result.data.map(toAdminUserDto),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    });
  }

  static async updateRole(ctx: Context) {
    const adminId = actorId(ctx);
    const parsed = updateAdminUserRoleBodySchema.safeParse(ctx.request.body);
    if (!parsed.success) {
      throw new BadRequestError(formatZodError(parsed.error));
    }

    const updated = await AdminUserService.updateRole(
      parsed.data.id,
      parsed.data.roleKey,
      adminId,
    );
    ctx.sendSuccess(toAdminUserDto(updated), { message: "角色已更新" });
  }

  static async updateStatus(ctx: Context) {
    const adminId = actorId(ctx);
    const parsed = updateAdminUserStatusBodySchema.safeParse(ctx.request.body);
    if (!parsed.success) {
      throw new BadRequestError(formatZodError(parsed.error));
    }

    const updated = await AdminUserService.updateStatus(
      parsed.data.id,
      parsed.data.status,
      adminId,
    );
    ctx.sendSuccess(toAdminUserDto(updated), {
      message: parsed.data.status === 1 ? "账号已启用" : "账号已停用",
    });
  }

  static async create(ctx: Context) {
    requireAdmin(ctx);
    const parsed = createAdminUserBodySchema.safeParse(ctx.request.body);
    if (!parsed.success) {
      throw new BadRequestError(formatZodError(parsed.error));
    }

    const created = await AdminUserService.create(parsed.data);
    ctx.sendSuccess(toAdminUserDto(created), { message: "用户已创建" });
  }
}
