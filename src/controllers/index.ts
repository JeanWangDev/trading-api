/**
 * Controller 聚合导出（按业务域分子目录：auth / market / dashboard）
 * 路由层推荐：`import { AuthController } from "@/controllers/auth"`
 * 或从此处统一：`import { AuthController } from "@/controllers"`
 */
export { AuthController } from "./auth";
export { AdminTradingSymbolController, AdminUserController } from "./admin";
export { MarketController } from "./market";
export { DashboardController } from "./dashboard";
