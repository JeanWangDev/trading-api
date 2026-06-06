import Router from "@koa/router";
import { AdminTradingSymbolController, AdminUserController } from "@/controllers/admin";

const router = new Router({ prefix: "/admin" });

router.get("/trading-pairs", AdminTradingSymbolController.list);
router.post("/trading-pairs", AdminTradingSymbolController.create);
router.post("/trading-pairs/update", AdminTradingSymbolController.update);
router.post("/trading-pairs/remove", AdminTradingSymbolController.remove);

router.get("/roles", AdminUserController.listRoles);
router.get("/users", AdminUserController.list);
router.post("/users", AdminUserController.create);
router.post("/users/update-role", AdminUserController.updateRole);
router.post("/users/update-status", AdminUserController.updateStatus);

export default router;
