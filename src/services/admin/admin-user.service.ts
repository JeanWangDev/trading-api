import { Op } from "sequelize";
import { Role, User, UserPasswordHistory, UserRole } from "@/db";
import { ROLE_KEYS, type RoleKey } from "@/constants/roles";
import { BadRequestError, NotFoundError } from "@/errors/app-error";
import { config } from "@/config";
import {
  assertStrongPassword,
  defaultNicknameFromEmail,
  hashPassword,
  normalizeEmail,
} from "@/utils/password";

export type AdminUserRecord = {
  id: number;
  email: string;
  nickname: string;
  status: number;
  roleKey: RoleKey;
  roleName: string;
  roleLevel: number;
  lastLoginTime: number | null;
  createdAt: number;
  updatedAt: number;
};

function assertDbReady() {
  if (!config.db.enabled) {
    throw new BadRequestError("数据库未启用");
  }
}

function mapUser(user: User): AdminUserRecord {
  const role = user.role!;
  return {
    id: user.id,
    email: user.email,
    nickname: user.nickname,
    status: user.status,
    roleKey: role.roleKey as RoleKey,
    roleName: role.roleName,
    roleLevel: role.roleLevel,
    lastLoginTime: user.lastLoginTime ? user.lastLoginTime.getTime() : null,
    createdAt: user.createTime.getTime(),
    updatedAt: user.updateTime.getTime(),
  };
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

export class AdminUserService {
  static async list(options: {
    page?: number;
    pageSize?: number;
    query?: string;
  }): Promise<{ data: AdminUserRecord[]; total: number; page: number; pageSize: number }> {
    assertDbReady();

    const page = Math.max(1, options.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, options.pageSize ?? 20));
    const offset = (page - 1) * pageSize;
    const q = options.query?.trim().toLowerCase();

    const where = q
      ? {
          [Op.or]: [
            { email: { [Op.like]: `%${q}%` } },
            { nickname: { [Op.like]: `%${q}%` } },
          ],
        }
      : {};

    const { rows, count } = await User.findAndCountAll({
      where,
      include: [{ model: Role, as: "role", required: true }],
      order: [["id", "DESC"]],
      limit: pageSize,
      offset,
    });

    return {
      data: rows.map(mapUser),
      total: count,
      page,
      pageSize,
    };
  }

  static async listRoles() {
    assertDbReady();
    const roles = await Role.findAll({
      where: { status: 1 },
      order: [["roleLevel", "ASC"]],
    });
    return roles.map((role) => ({
      roleKey: role.roleKey as RoleKey,
      roleName: role.roleName,
      roleLevel: role.roleLevel,
    }));
  }

  static async updateRole(
    userId: number,
    roleKey: RoleKey,
    actorUserId: number,
  ): Promise<AdminUserRecord> {
    assertDbReady();

    if (!ROLE_KEYS.includes(roleKey)) {
      throw new BadRequestError("无效的角色");
    }

    const role = await Role.findOne({ where: { roleKey, status: 1 } });
    if (!role) {
      throw new NotFoundError("角色不存在");
    }

    const user = await User.findByPk(userId, {
      include: [{ model: Role, as: "role", required: true }],
    });
    if (!user) {
      throw new NotFoundError("用户不存在");
    }

    if (user.id === actorUserId && roleKey !== "admin" && roleKey !== "super_admin") {
      throw new BadRequestError("不能将自己的角色降级为非管理员");
    }

    user.roleId = role.id;
    user.updateTime = new Date();
    await user.save();
    await syncPrimaryUserRole(user.id, role.id);

    await user.reload({ include: [{ model: Role, as: "role", required: true }] });
    return mapUser(user);
  }

  static async updateStatus(
    userId: number,
    status: 0 | 1,
    actorUserId: number,
  ): Promise<AdminUserRecord> {
    assertDbReady();

    const user = await User.findByPk(userId, {
      include: [{ model: Role, as: "role", required: true }],
    });
    if (!user) {
      throw new NotFoundError("用户不存在");
    }

    if (user.id === actorUserId && status === 0) {
      throw new BadRequestError("不能停用自己的账号");
    }

    user.status = status;
    user.updateTime = new Date();
    await user.save();

    return mapUser(user);
  }

  static async create(
    input: {
      email: string;
      password: string;
      nickname?: string;
      roleKey: RoleKey;
    },
    options?: { skipPasswordCheck?: boolean },
  ): Promise<AdminUserRecord> {
    assertDbReady();

    const email = normalizeEmail(input.email);
    if (!options?.skipPasswordCheck) {
      assertStrongPassword(input.password);
    }

    const role = await Role.findOne({ where: { roleKey: input.roleKey, status: 1 } });
    if (!role) {
      throw new BadRequestError("无效的角色");
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      throw new BadRequestError("该邮箱已注册");
    }

    const passwordHash = await hashPassword(input.password);
    const nickname = input.nickname?.trim() || defaultNicknameFromEmail(email);
    const now = new Date();

    const user = await User.create({
      email,
      nickname,
      passwordHash,
      roleId: role.id,
      status: 1,
      createTime: now,
      updateTime: now,
    });

    await UserRole.create({
      userId: user.id,
      roleId: role.id,
      isPrimary: 1,
    });

    await UserPasswordHistory.create({
      userId: user.id,
      passwordHash,
      reason: "admin_create",
    });

    await user.reload({ include: [{ model: Role, as: "role", required: true }] });
    return mapUser(user);
  }

  /** 将指定邮箱设为管理员；不存在则跳过 */
  static async promoteToAdminByEmail(email: string): Promise<AdminUserRecord | null> {
    assertDbReady();

    const normalized = normalizeEmail(email);
    const role = await Role.findOne({ where: { roleKey: "admin", status: 1 } });
    if (!role) {
      throw new BadRequestError("管理员角色未配置");
    }

    const user = await User.findOne({
      where: { email: normalized },
      include: [{ model: Role, as: "role", required: true }],
    });
    if (!user) return null;

    user.roleId = role.id;
    user.updateTime = new Date();
    await user.save();
    await syncPrimaryUserRole(user.id, role.id);

    await user.reload({ include: [{ model: Role, as: "role", required: true }] });
    return mapUser(user);
  }

  /** 创建或更新管理员账号 */
  static async ensureAdminAccount(
    input: {
      email: string;
      password: string;
      nickname?: string;
    },
    options?: { skipPasswordCheck?: boolean },
  ): Promise<AdminUserRecord> {
    assertDbReady();

    const email = normalizeEmail(input.email);
    const existing = await User.findOne({
      where: { email },
      include: [{ model: Role, as: "role", required: true }],
    });

    const adminRole = await Role.findOne({ where: { roleKey: "admin", status: 1 } });
    if (!adminRole) {
      throw new BadRequestError("管理员角色未配置");
    }

    if (existing) {
      if (!options?.skipPasswordCheck) {
        assertStrongPassword(input.password);
      }
      const passwordHash = await hashPassword(input.password);
      existing.roleId = adminRole.id;
      existing.passwordHash = passwordHash;
      existing.status = 1;
      if (input.nickname?.trim()) {
        existing.nickname = input.nickname.trim();
      }
      existing.updateTime = new Date();
      await existing.save();
      await syncPrimaryUserRole(existing.id, adminRole.id);
      await UserPasswordHistory.create({
        userId: existing.id,
        passwordHash,
        reason: "admin_reset",
      });
      await existing.reload({ include: [{ model: Role, as: "role", required: true }] });
      return mapUser(existing);
    }

    return AdminUserService.create(
      {
        email,
        password: input.password,
        nickname: input.nickname,
        roleKey: "admin",
      },
      options,
    );
  }
}
