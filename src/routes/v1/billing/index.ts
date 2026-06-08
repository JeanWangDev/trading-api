import Router from "@koa/router";
import { BillingController } from "@/controllers/billing";

const router = new Router({ prefix: "/billing" });

router.get("/plans", BillingController.plans);
router.get("/subscription", BillingController.subscription);
router.post("/orders", BillingController.createOrder);
router.get("/orders", BillingController.listOrders);
router.get("/orders/:orderNo", BillingController.getOrder);
router.post("/orders/:orderNo/cancel", BillingController.cancelOrder);

export default router;
