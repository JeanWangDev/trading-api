import Router from "@koa/router";
import { CreatorController } from "@/controllers/creator/creator.controller";

const router = new Router({ prefix: "/creator" });

router.get("/balance", CreatorController.balance);
router.post("/withdraw", CreatorController.withdraw);

export default router;
