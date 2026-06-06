import Router from "@koa/router";
import { EventsController } from "@/controllers/events";

const router = new Router({ prefix: "/events" });

router.get("/list", EventsController.list);
router.get("/chart", EventsController.chart);
router.get("/recent", EventsController.recent);
router.get("/:id", EventsController.getById);

export default router;
