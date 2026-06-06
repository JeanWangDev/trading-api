/**
 * 数据库模型入口：按业务域放在 models/auth/，此处统一初始化与导出
 */
import {
  initRoleModel,
  initUserModel,
  initUserPasswordHistoryModel,
  initUserResetTokenModel,
  initUserRoleModel,
  initEmailVerificationModel,
} from "@/db/models/auth";
import { initEventModel } from "@/db/models/events";
import { initTradingSymbolModel } from "@/db/models/market";

import { initChartTemplateModel, initChartTemplateUsageModel } from "@/db/models/chart-template";

/** 启动时注册 Sequelize 模型（需在 initDatabase 之后调用） */
export async function initModels() {
  await initRoleModel();
  await initUserModel();
  await initUserRoleModel();
  await initUserPasswordHistoryModel();
  await initUserResetTokenModel();
  await initEmailVerificationModel();
  await initEventModel();
  await initTradingSymbolModel();
  await initChartTemplateModel();
  await initChartTemplateUsageModel();
}

export {
  Role,
  User,
  UserPasswordHistory,
  UserResetToken,
  UserRole,
  EmailVerification,
} from "@/db/models/auth";

export { Event } from "@/db/models/events";
export { TradingSymbol } from "@/db/models/market";
export { ChartTemplate, ChartTemplateUsage } from "@/db/models/chart-template";
