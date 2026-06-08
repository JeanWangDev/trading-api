import type { Context } from "koa";
import { toMembershipPlanDto } from "@/dto/billing";
import { BadRequestError } from "@/errors/app-error";
import { requireAuthUser } from "@/middlewares/auth.middleware";
import {
  BillingOrderService,
  BillingPlanService,
  BillingSubscriptionService,
} from "@/services/billing";
import { createBillingOrderBodySchema, validateBody } from "@/validators";

export class BillingController {
  static async plans(ctx: Context) {
    const plans = await BillingPlanService.listActive();
    ctx.sendSuccess({ plans: plans.map(toMembershipPlanDto) });
  }

  static async subscription(ctx: Context) {
    const authUser = requireAuthUser(ctx);
    const userId = Number(authUser.id);
    if (!Number.isFinite(userId)) {
      throw new BadRequestError("无效的用户身份");
    }

    const subscription = await BillingSubscriptionService.getActiveForUser(userId);
    ctx.sendSuccess({ subscription });
  }

  static async createOrder(ctx: Context) {
    const authUser = requireAuthUser(ctx);
    const userId = Number(authUser.id);
    if (!Number.isFinite(userId)) {
      throw new BadRequestError("无效的用户身份");
    }

    const body = validateBody(createBillingOrderBodySchema, ctx.request.body);
    const order = await BillingOrderService.createOrder(userId, body.planKey);
    ctx.sendSuccess({ order });
  }

  static async getOrder(ctx: Context) {
    const authUser = requireAuthUser(ctx);
    const userId = Number(authUser.id);
    if (!Number.isFinite(userId)) {
      throw new BadRequestError("无效的用户身份");
    }

    const orderNo = String(ctx.params.orderNo ?? "").trim();
    if (!orderNo) {
      throw new BadRequestError("订单号无效");
    }

    const order = await BillingOrderService.getOrderForUser(userId, orderNo);
    ctx.sendSuccess({ order });
  }

  static async listOrders(ctx: Context) {
    const authUser = requireAuthUser(ctx);
    const userId = Number(authUser.id);
    if (!Number.isFinite(userId)) {
      throw new BadRequestError("无效的用户身份");
    }

    const orders = await BillingOrderService.listOrdersForUser(userId, 50);
    ctx.sendSuccess({ orders });
  }

  static async cancelOrder(ctx: Context) {
    const authUser = requireAuthUser(ctx);
    const userId = Number(authUser.id);
    if (!Number.isFinite(userId)) {
      throw new BadRequestError("无效的用户身份");
    }

    const orderNo = String(ctx.params.orderNo ?? "").trim();
    if (!orderNo) {
      throw new BadRequestError("订单号无效");
    }

    const order = await BillingOrderService.cancelOrder(userId, orderNo);
    ctx.sendSuccess({ order });
  }
}
