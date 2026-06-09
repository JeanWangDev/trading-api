import Router from "@koa/router";
import adminRoutes from "./admin";
import authRoutes from "./auth";
import chartTemplateRoutes from "./chart-templates";
import dashboardRoutes from "./dashboard";
import eventsRoutes from "./events";
import marketRoutes from "./market";
import billingRoutes from "./billing";
import strategyRoutes from "./strategies";
import creatorRoutes from "./creator";
import exchangeRoutes from "./exchanges";
import copyRoutes from "./copy";

const router = new Router({ prefix: "/v1" });

router.use(authRoutes.routes(), authRoutes.allowedMethods());
router.use(adminRoutes.routes(), adminRoutes.allowedMethods());
router.use(dashboardRoutes.routes(), dashboardRoutes.allowedMethods());
router.use(marketRoutes.routes(), marketRoutes.allowedMethods());
router.use(chartTemplateRoutes.routes(), chartTemplateRoutes.allowedMethods());
router.use(eventsRoutes.routes(), eventsRoutes.allowedMethods());
router.use(billingRoutes.routes(), billingRoutes.allowedMethods());
router.use(strategyRoutes.routes(), strategyRoutes.allowedMethods());
router.use(creatorRoutes.routes(), creatorRoutes.allowedMethods());
router.use(exchangeRoutes.routes(), exchangeRoutes.allowedMethods());
router.use(copyRoutes.routes(), copyRoutes.allowedMethods());

export default router;
