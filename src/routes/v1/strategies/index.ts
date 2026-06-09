import Router from "@koa/router";
import { StrategyController } from "@/controllers/strategy";

const router = new Router({ prefix: "/strategies" });

router.get("/", StrategyController.list);
router.post("/", StrategyController.create);
router.post("/update", StrategyController.update);
router.get("/mine", StrategyController.mine);
router.get("/:strategyKey/stats", StrategyController.stats);
router.get("/:strategyKey/signal", StrategyController.signal);
router.get("/:strategyKey", StrategyController.detail);

export default router;
