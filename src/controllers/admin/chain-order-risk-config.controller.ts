import type { Context } from "koa";
import { BadRequestError } from "@/errors/app-error";
import { requireAdmin } from "@/middlewares/require-admin.middleware";
import { ChainOrderService } from "@/services/chain-order";
import { updateChainOrderRiskConfigBodySchema } from "@/validators/admin";
import { formatZodError } from "@/validators/common/parse";

function adminUserId(ctx: Context): number {
  const user = requireAdmin(ctx);
  const id = Number(user.id);
  if (!Number.isFinite(id) || id <= 0) {
    throw new BadRequestError("无效的管理员身份");
  }
  return id;
}

export class AdminChainOrderRiskConfigController {
  static async get(ctx: Context) {
    requireAdmin(ctx);
    const config = await ChainOrderService.getRiskConfig();
    ctx.sendSuccess({ config });
  }

  static async update(ctx: Context) {
    const userId = adminUserId(ctx);
    const parsed = updateChainOrderRiskConfigBodySchema.safeParse(ctx.request.body);
    if (!parsed.success) {
      throw new BadRequestError(formatZodError(parsed.error));
    }

    const config = await ChainOrderService.updateRiskConfig(parsed.data, userId);
    ctx.sendSuccess({ config }, { message: "链上交易风控配置已更新" });
  }
}
