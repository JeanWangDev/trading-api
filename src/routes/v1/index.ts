import Router from "@koa/router";
import adminRoutes from "./admin";
import authRoutes from "./auth";
import chartTemplateRoutes from "./chart-templates";
import dashboardRoutes from "./dashboard";
import eventsRoutes from "./events";
import marketRoutes from "./market";
import billingRoutes from "./billing";

const router = new Router({ prefix: "/v1" });

router.use(authRoutes.routes(), authRoutes.allowedMethods());
router.use(adminRoutes.routes(), adminRoutes.allowedMethods());
router.use(dashboardRoutes.routes(), dashboardRoutes.allowedMethods());
router.use(marketRoutes.routes(), marketRoutes.allowedMethods());
router.use(chartTemplateRoutes.routes(), chartTemplateRoutes.allowedMethods());
router.use(eventsRoutes.routes(), eventsRoutes.allowedMethods());
router.use(billingRoutes.routes(), billingRoutes.allowedMethods());

export default router;
