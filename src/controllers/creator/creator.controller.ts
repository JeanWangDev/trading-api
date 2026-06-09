import type { Context } from "koa";
import { BadRequestError } from "@/errors/app-error";
import { requireAuthUser } from "@/middlewares/auth.middleware";
import { CreatorPayoutService } from "@/services/creator/creator-payout.service";
import { z } from "zod";

const withdrawSchema = z.object({
  amountUsdt: z.coerce.number().positive(),
  address: z.string().trim().min(10).max(128),
  chain: z.string().trim().max(16).optional(),
});

function parseUserId(ctx: Context): number {
  const authUser = requireAuthUser(ctx);
  const userId = Number(authUser.id);
  if (!Number.isFinite(userId) || userId <= 0) {
    throw new BadRequestError("无效的用户身份");
  }
  return userId;
}

export class CreatorController {
  static async balance(ctx: Context) {
    const userId = parseUserId(ctx);
    const data = await CreatorPayoutService.getBalance(userId);
    ctx.sendSuccess(data);
  }

  static async withdraw(ctx: Context) {
    const userId = parseUserId(ctx);
    const parsed = withdrawSchema.safeParse(ctx.request.body);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.issues.map((i) => i.message).join("；"));
    }
    const result = await CreatorPayoutService.requestWithdrawal(userId, parsed.data);
    ctx.sendSuccess(result);
  }
}
