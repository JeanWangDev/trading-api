import Router from "@koa/router";
import { ChainOrderController } from "@/controllers/chain-order";

const router = new Router({ prefix: "/chain-orders" });

router.post("/", ChainOrderController.upsert);
router.get("/", ChainOrderController.list);
router.get("/performance/summary", ChainOrderController.performanceSummary);
router.get("/:orderId", ChainOrderController.detail);

export default router;
