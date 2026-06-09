import Router from "@koa/router";
import { CopyController } from "@/controllers/copy/copy.controller";

const router = new Router({ prefix: "/copy" });

router.get("/subscriptions", CopyController.list);
router.post("/subscribe", CopyController.subscribe);
router.post("/unsubscribe", CopyController.unsubscribe);

export default router;
