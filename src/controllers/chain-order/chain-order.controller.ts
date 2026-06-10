import type { Context } from "koa";
import {
  toChainOrderDto,
  toChainOrderPerformanceDto,
} from "@/dto/chain-order";
import { BadRequestError } from "@/errors/app-error";
import { requireAuthUser } from "@/middlewares/auth.middleware";
import { ChainOrderService } from "@/services/chain-order";
import {
  chainOrderIdParamSchema,
  listChainOrdersQuerySchema,
  preflightChainOrderBodySchema,
  upsertChainOrderBodySchema,
  validateBody,
  validateQuery,
} from "@/validators";

function parseUserId(ctx: Context): number {
  const authUser = requireAuthUser(ctx);
  const userId = Number(authUser.id);
  if (!Number.isFinite(userId) || userId <= 0) {
    throw new BadRequestError("无效的用户身份，请重新登录");
  }
  return userId;
}

export class ChainOrderController {
  static async preflight(ctx: Context) {
    const userId = parseUserId(ctx);
    const body = validateBody(preflightChainOrderBodySchema, ctx.request.body);
    const result = await ChainOrderService.preflight(userId, body);
    ctx.sendSuccess(result);
  }

  static async upsert(ctx: Context) {
    const userId = parseUserId(ctx);
    const body = validateBody(upsertChainOrderBodySchema, ctx.request.body);
    const order = await ChainOrderService.upsertFromChainTx(userId, body);
    ctx.sendSuccess({ order: toChainOrderDto(order) }, { message: "链上订单已保存" });
  }

  static async list(ctx: Context) {
    const userId = parseUserId(ctx);
    const query = validateQuery(listChainOrdersQuerySchema, ctx.query);
    const result = await ChainOrderService.listForUser(userId, query);
    ctx.sendSuccess({
      orders: result.orders.map(toChainOrderDto),
      nextCursor: result.nextCursor,
    });
  }

  static async detail(ctx: Context) {
    const userId = parseUserId(ctx);
    const params = validateBody(chainOrderIdParamSchema, ctx.params);
    const order = await ChainOrderService.getForUser(userId, params.orderId);
    ctx.sendSuccess({ order: toChainOrderDto(order) });
  }

  static async performanceSummary(ctx: Context) {
    const userId = parseUserId(ctx);
    const items = await ChainOrderService.performanceSummary(userId);
    ctx.sendSuccess({ items: items.map(toChainOrderPerformanceDto) });
  }
}
