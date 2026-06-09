import Router from "@koa/router";
import { ExchangeController } from "@/controllers/exchange/exchange.controller";

const router = new Router({ prefix: "/exchanges" });

router.get("/", ExchangeController.list);
router.post("/okx/connect", ExchangeController.connectOkx);
router.post("/okx/disconnect", ExchangeController.disconnectOkx);

export default router;
