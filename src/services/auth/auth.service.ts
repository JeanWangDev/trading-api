import { config } from "@/config";
import { Role, User, UserPasswordHistory, UserRole } from "@/db";
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
} from "@/errors/app-error";
import type { AuthUserProfile } from "@/types/auth";
import {
  defaultNicknameFromEmail,
  hashPassword,
  verifyPassword,
} from "@/utils/password";
import { signAccessToken } from "@/utils/jwt";
import { DEFAULT_REGISTER_ROLE_KEY } from "@/constants/roles";
import {
  EMAIL_PURPOSE_REGISTER,
  EMAIL_PURPOSE_RESET_PASSWORD,
  EmailVerificationService,
} from "@/services/auth/email-verification.service";
import type {
  ForgotPasswordBody,
  LoginBody,
  RegisterBody,
  ResetPasswordBody,
  SendEmailCodeBody,
  UpdateProfileBody,
} from "@/validators";

function assertDbReady() {
  if (!config.db.enabled) {
    throw new BadRequestError("数据库未启用，无法使用认证功能");
  }
}

async function findUserWithRole(userId: number): Promise<AuthUserProfile | null> {
  const user = await User.findByPk(userId, {
    include: [{ model: Role, as: "role", required: true }],
  });

  if (!user || !user.role) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    nickname: user.nickname,
    roleKey: user.role.roleKey,
    roleName: user.role.roleName,
    roleLevel: user.role.roleLevel,
  };
}

async function findUserByEmailWithRole(email: string): Promise<User | null> {
  return User.findOne({
    where: { email },
    include: [{ model: Role, as: "role", required: true }],
  });
}

function toSession(user: AuthUserProfile) {
  const { accessToken, expiresAt } = signAccessToken({
    id: String(user.id),
    email: user.email,
    nickname: user.nickname,
    roleKey: user.roleKey,
    roleLevel: user.roleLevel,
  });

  return { accessToken, expiresAt, user };
}

export class AuthService {
  static async listRoles() {
    assertDbReady();

    const roles = await Role.findAll({
      where: { status: 1 },
      order: [["roleLevel", "ASC"]],
    });

    return roles.map((role) => ({
      roleKey: role.roleKey,
      roleName: role.roleName,
      roleLevel: role.roleLevel,
    }));
  }

  static async sendEmailCode(body: SendEmailCodeBody) {
    assertDbReady();
    return EmailVerificationService.sendCode(body.email, body.purpose);
  }

  static async register(body: RegisterBody) {
    assertDbReady();

    await EmailVerificationService.verifyAndConsume(
      body.email,
      EMAIL_PURPOSE_REGISTER,
      body.code,
    );

    const role = await Role.findOne({
      where: { roleKey: DEFAULT_REGISTER_ROLE_KEY, status: 1 },
    });

    if (!role) {
      throw new BadRequestError("默认角色未配置，请联系管理员");
    }

    const existing = await User.findOne({ where: { email: body.email } });
    if (existing) {
      throw new BadRequestError("该邮箱已注册");
    }

    const passwordHash = await hashPassword(body.password);
    const nickname = defaultNicknameFromEmail(body.email);

    const user = await User.create({
      email: body.email,
      nickname,
      passwordHash,
      roleId: role.id,
      status: 1,
    });

    await UserRole.create({
      userId: user.id,
      roleId: role.id,
      isPrimary: 1,
    });

    await UserPasswordHistory.create({
      userId: user.id,
      passwordHash,
      reason: "register",
    });

    const profile = await findUserWithRole(user.id);
    if (!profile) {
      throw new BadRequestError("注册失败，请稍后重试");
    }

    return toSession(profile);
  }

  static async login(body: LoginBody) {
    assertDbReady();

    const user = await findUserByEmailWithRole(body.email);

    if (!user) {
      throw new NotFoundError("该账号不存在，请先注册");
    }

    if (user.status !== 1) {
      throw new BadRequestError("账号已停用，请联系管理员");
    }

    const ok = await verifyPassword(body.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedError("密码错误");
    }

    user.lastLoginTime = new Date();
    await user.save();

    const profile: AuthUserProfile = {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      roleKey: user.role!.roleKey,
      roleName: user.role!.roleName,
      roleLevel: user.role!.roleLevel,
    };

    return toSession(profile);
  }

  static async forgotPassword(body: ForgotPasswordBody) {
    assertDbReady();

    try {
      return await EmailVerificationService.sendCode(
        body.email,
        EMAIL_PURPOSE_RESET_PASSWORD,
      );
    } catch (error) {
      if (error instanceof BadRequestError && error.message.includes("未注册")) {
        return { message: "如果该邮箱已注册，验证码已发送" };
      }
      throw error;
    }
  }

  static async resetPassword(body: ResetPasswordBody) {
    assertDbReady();

    const user = await User.findOne({ where: { email: body.email, status: 1 } });
    if (!user) {
      throw new BadRequestError("验证码错误或已过期");
    }

    await EmailVerificationService.verifyAndConsume(
      body.email,
      EMAIL_PURPOSE_RESET_PASSWORD,
      body.code,
    );

    const lastHistory = await UserPasswordHistory.findOne({
      where: { userId: user.id },
      order: [["createTime", "DESC"]],
    });

    if (lastHistory && (await verifyPassword(body.password, lastHistory.passwordHash))) {
      throw new BadRequestError("新密码不能与上一次密码相同");
    }

    const passwordHash = await hashPassword(body.password);

    user.passwordHash = passwordHash;
    await user.save();

    await UserPasswordHistory.create({
      userId: user.id,
      passwordHash,
      reason: "reset",
    });

    const profile = await findUserWithRole(user.id);
    if (!profile) {
      throw new BadRequestError("重置失败，请稍后重试");
    }

    return toSession(profile);
  }

  static async getProfileById(userId: number) {
    assertDbReady();
    return findUserWithRole(userId);
  }

  static async updateProfile(userId: number, body: UpdateProfileBody) {
    assertDbReady();

    const user = await User.findByPk(userId);
    if (!user || user.status !== 1) {
      throw new UnauthorizedError("登录状态已失效，请重新登录");
    }

    user.nickname = body.nickname;
    user.updateTime = new Date();
    await user.save();

    const profile = await findUserWithRole(user.id);
    if (!profile) {
      throw new BadRequestError("更新失败，请稍后重试");
    }

    return profile;
  }
}
