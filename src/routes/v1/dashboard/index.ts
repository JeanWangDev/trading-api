import Router from "@koa/router";
import { DashboardController } from "@/controllers/dashboard";

const router = new Router({ prefix: "/dashboard" });

router.get("/overview", DashboardController.overview);

export default router;
