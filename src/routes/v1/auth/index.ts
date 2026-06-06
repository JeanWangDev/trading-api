import Router from "@koa/router";
import { AuthController } from "@/controllers/auth";

const router = new Router({ prefix: "/auth" });

router.get("/roles", AuthController.roles);
router.post("/send-code", AuthController.sendEmailCode);
router.post("/register", AuthController.register);
router.post("/login", AuthController.login);
router.post("/forgot-password", AuthController.forgotPassword);
router.post("/reset-password", AuthController.resetPassword);
router.get("/me", AuthController.me);
router.post("/update-profile", AuthController.updateProfile);

export default router;
