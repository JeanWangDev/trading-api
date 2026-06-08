import { MembershipPlan } from "@/db";
import { BadRequestError } from "@/errors/app-error";
import { config } from "@/config";

function assertDbReady() {
  if (!config.db.enabled) {
    throw new BadRequestError("数据库未启用");
  }
}

export class BillingPlanService {
  static async listActive() {
    assertDbReady();

    const rows = await MembershipPlan.findAll({
      where: { status: 1 },
      order: [
        ["sortOrder", "ASC"],
        ["id", "ASC"],
      ],
    });

    return rows.map((row) => ({
      planKey: row.planKey,
      name: row.name,
      description: row.description,
      priceUsdt: String(row.priceUsdt),
      durationDays: row.durationDays,
      targetRoleKey: row.targetRoleKey,
      chain: row.chain,
      asset: row.asset,
    }));
  }

  static async getActiveByKey(planKey: string) {
    assertDbReady();

    const plan = await MembershipPlan.findOne({
      where: { planKey, status: 1 },
    });

    if (!plan) {
      throw new BadRequestError("套餐不存在或已下架");
    }

    return plan;
  }
}
