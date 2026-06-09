import type { Context } from "koa";
import { BadRequestError } from "@/errors/app-error";
import { requireAuthUser } from "@/middlewares/auth.middleware";
import { ExchangeConnectionService } from "@/services/exchange/exchange-connection.service";
import { z } from "zod";

const connectOkxSchema = z.object({
  apiKey: z.string().trim().min(1),
  secretKey: z.string().trim().min(1),
  passphrase: z.string().trim().min(1),
  label: z.string().trim().max(64).optional(),
});

function parseUserId(ctx: Context): number {
  const authUser = requireAuthUser(ctx);
  const userId = Number(authUser.id);
  if (!Number.isFinite(userId) || userId <= 0) {
    throw new BadRequestError("无效的用户身份");
  }
  return userId;
}

export class ExchangeController {
  static async list(ctx: Context) {
    const userId = parseUserId(ctx);
    const connections = await ExchangeConnectionService.listForUser(userId);
    ctx.sendSuccess({ connections });
  }

  static async connectOkx(ctx: Context) {
    const userId = parseUserId(ctx);
    const parsed = connectOkxSchema.safeParse(ctx.request.body);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.issues.map((i) => i.message).join("；"));
    }
    const connection = await ExchangeConnectionService.connectOkx(userId, parsed.data);
    ctx.sendSuccess({ connection });
  }

  static async disconnectOkx(ctx: Context) {
    const userId = parseUserId(ctx);
    await ExchangeConnectionService.disconnect(userId, "okx");
    ctx.sendSuccess(null);
  }
}
