/**
 * 初始化管理员账号：
 * - wangyongjian317@gmail.com → admin（若已注册）
 * - admin@gmail.com / Admin123456 → admin（创建或重置密码）
 *
 * 用法：yarn seed:admin-users
 */
import { registerModuleAliases } from "../src/register-aliases";

registerModuleAliases(__dirname);

import { initModels } from "@/db";
import { initDatabase } from "@/db/connection";
import { AdminUserService } from "@/services/admin/admin-user.service";

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
  console.log(`[seed] admin account ready: ${admin.email} (level ${admin.roleLevel})`);
}

main().catch((err) => {
  console.error("[seed:admin-users] failed:", err);
  process.exit(1);
});
