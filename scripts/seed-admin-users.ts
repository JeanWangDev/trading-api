/**
 * 初始化管理员账号：
 * - wangyongjian317@gmail.com → admin（若已注册）
 * - admin@gmail.com / Admin123456 → admin（创建或重置密码）
 *
 * 用法：yarn seed:admin-users
 */
import path from "path";
import dotenv from "dotenv";
import { initModels } from "@/db";
import { initDatabase } from "@/db/connection";
import { AdminUserService } from "@/services/admin/admin-user.service";

const root = process.cwd();
const nodeEnv = process.env.NODE_ENV ?? "development";
dotenv.config({ path: path.resolve(root, `.env.${nodeEnv}`) });

async function main() {
  await initDatabase();
  await initModels();

  const promoted = await AdminUserService.promoteToAdminByEmail("wangyongjian317@gmail.com");
  if (promoted) {
    console.log(`[seed] promoted ${promoted.email} → admin (level ${promoted.roleLevel})`);
  } else {
    console.log("[seed] wangyongjian317@gmail.com not found — register first, then re-run");
  }

  const admin = await AdminUserService.ensureAdminAccount(
    {
      email: "admin@gmail.com",
      password: "Admin123456",
      nickname: "Admin",
    },
    { skipPasswordCheck: true },
  );
  console.log(`[seed] ensured admin account ${admin.email} (role: ${admin.roleKey})`);

  console.log("[seed] done");
  process.exit(0);
}

main().catch((err) => {
  console.error("[seed] failed:", err.message ?? err);
  process.exit(1);
});
