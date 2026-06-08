import type { Context } from "koa";
import { AdminBillingOrderService } from "@/services/admin/admin-billing-order.service";

export class AdminBillingOrderController {
  static async list(ctx: Context) {
    const page = Number(ctx.query.page ?? 1);
    const pageSize = Number(ctx.query.pageSize ?? 20);
    const status = typeof ctx.query.status === "string" ? ctx.query.status : undefined;
    const query = typeof ctx.query.query === "string" ? ctx.query.query : undefined;

    const result = await AdminBillingOrderService.list({
      page: Number.isFinite(page) ? page : 1,
      pageSize: Number.isFinite(pageSize) ? pageSize : 20,
      status,
      query,
    });

    ctx.sendSuccess(result);
  }
}
