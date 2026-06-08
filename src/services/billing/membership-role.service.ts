import { Role, User, UserRole } from "@/db";
import { NORMAL_ROLE_KEY } from "@/constants/billing";
import { BadRequestError } from "@/errors/app-error";
import { config } from "@/config";

function assertDbReady() {
  if (!config.db.enabled) {
    throw new BadRequestError("数据库未启用");
  }
}

async function syncPrimaryUserRole(userId: number, roleId: number) {
  await UserRole.update({ isPrimary: 0 }, { where: { userId } });

  const existing = await UserRole.findOne({ where: { userId, roleId } });
  if (existing) {
    await existing.update({ isPrimary: 1 });
  } else {
    await UserRole.create({ userId, roleId, isPrimary: 1 });
  }
}

export class MembershipRoleService {
  static async upgradeUserRole(userId: number, roleKey: string): Promise<void> {
    assertDbReady();

    const role = await Role.findOne({ where: { roleKey, status: 1 } });
    if (!role) {
      throw new BadRequestError(`角色 ${roleKey} 未配置`);
    }

    const user = await User.findByPk(userId);
    if (!user || user.status !== 1) {
      throw new BadRequestError("用户不存在或已停用");
    }

    if (user.roleId === role.id) {
      return;
    }

    user.roleId = role.id;
    await user.save();
    await syncPrimaryUserRole(userId, role.id);
  }

  static async downgradeToNormalIfNeeded(userId: number): Promise<void> {
    assertDbReady();
    await MembershipRoleService.upgradeUserRole(userId, NORMAL_ROLE_KEY);
  }
}
