import Router from "@koa/router";
import { ChartTemplateController } from "@/controllers/chart-template";

const router = new Router({ prefix: "/chart-templates" });

router.get("/public", ChartTemplateController.listPublic);
router.get("/rankings", ChartTemplateController.rankings);
router.post("/track", ChartTemplateController.track);
router.get("/starter", ChartTemplateController.getStarter);
router.get("/detail", ChartTemplateController.detail);
router.get("/mine", ChartTemplateController.listMine);
router.get("/default", ChartTemplateController.getDefault);
router.post("/", ChartTemplateController.create);
router.post("/update", ChartTemplateController.update);
router.post("/set-default", ChartTemplateController.setDefault);
router.post("/remove", ChartTemplateController.remove);

export default router;
