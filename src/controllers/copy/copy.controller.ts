import type { Context } from "koa";
import { BadRequestError } from "@/errors/app-error";
import { requireAuthUser } from "@/middlewares/auth.middleware";
import { CopyTradingService } from "@/services/copy/copy-trading.service";
import { z } from "zod";

const subscribeSchema = z.object({
  strategyKey: z.string().trim().min(1),
  exchangeConnectionId: z.coerce.number().int().positive(),
  orderSizeUsdt: z.coerce.number().positive().max(100000).optional(),
  tradeMode: z.enum(["live", "paper"]).optional(),
});

function parseUserId(ctx: Context): number {
  const authUser = requireAuthUser(ctx);
  const userId = Number(authUser.id);
  if (!Number.isFinite(userId) || userId <= 0) {
    throw new BadRequestError("无效的用户身份");
  }
  return userId;
}

export class CopyController {
  static async list(ctx: Context) {
    const userId = parseUserId(ctx);
    const subscriptions = await CopyTradingService.listForUser(userId);
    ctx.sendSuccess({ subscriptions });
  }

  static async subscribe(ctx: Context) {
    const userId = parseUserId(ctx);
    const parsed = subscribeSchema.safeParse(ctx.request.body);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.issues.map((i) => i.message).join("；"));
    }
    const subscription = await CopyTradingService.subscribe(userId, parsed.data);
    ctx.sendSuccess({ subscription });
  }

  static async unsubscribe(ctx: Context) {
    const userId = parseUserId(ctx);
    const body = ctx.request.body as { strategyKey?: string };
    const strategyKey = String(body.strategyKey ?? "").trim();
    if (!strategyKey) {
      throw new BadRequestError("策略标识无效");
    }
    await CopyTradingService.unsubscribe(userId, strategyKey);
    ctx.sendSuccess(null);
  }
}
