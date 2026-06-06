import type { Context } from "koa";
import { toDashboardOverviewDto } from "@/dto/dashboard";
import { DashboardService } from "@/services/dashboard";

export class DashboardController {
  static async overview(ctx: Context) {
    const data = await DashboardService.getOverview();
    ctx.sendSuccess(toDashboardOverviewDto(data));
  }
}
