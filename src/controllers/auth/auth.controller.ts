import type { Context } from "koa";
import { toAuthSessionDto, toAuthUserDto } from "@/dto/auth";
import { BadRequestError } from "@/errors/app-error";
import { requireAuthUser } from "@/middlewares/auth.middleware";
import { AuthService } from "@/services/auth";
import {
  forgotPasswordBodySchema,
  loginBodySchema,
  registerBodySchema,
  resetPasswordBodySchema,
  sendEmailCodeBodySchema,
  updateProfileBodySchema,
  validateBody,
} from "@/validators";

export class AuthController {
  static async roles(ctx: Context) {
    const roles = await AuthService.listRoles();
    ctx.sendSuccess(roles);
  }

  static async sendEmailCode(ctx: Context) {
    const body = validateBody(sendEmailCodeBodySchema, ctx.request.body);
    const result = await AuthService.sendEmailCode(body);
    ctx.sendSuccess(result);
  }

  static async register(ctx: Context) {
    const body = validateBody(registerBodySchema, ctx.request.body);
    const session = await AuthService.register(body);
    ctx.sendSuccess(toAuthSessionDto(session));
  }

  static async login(ctx: Context) {
    const body = validateBody(loginBodySchema, ctx.request.body);
    const session = await AuthService.login(body);
    ctx.sendSuccess(toAuthSessionDto(session));
  }

  static async forgotPassword(ctx: Context) {
    const body = validateBody(forgotPasswordBodySchema, ctx.request.body);
    const result = await AuthService.forgotPassword(body);
    ctx.sendSuccess(result);
  }

  static async resetPassword(ctx: Context) {
    const body = validateBody(resetPasswordBodySchema, ctx.request.body);
    const session = await AuthService.resetPassword(body);
    ctx.sendSuccess(toAuthSessionDto(session));
  }

  static async me(ctx: Context) {
    const authUser = requireAuthUser(ctx);
    const userId = Number(authUser.id);

    if (!Number.isFinite(userId)) {
      ctx.sendSuccess({ user: authUser });
      return;
    }

    const profile = await AuthService.getProfileById(userId);
    if (!profile) {
      ctx.sendSuccess({ user: authUser });
      return;
    }

    ctx.sendSuccess({ user: toAuthUserDto(profile) });
  }

  static async updateProfile(ctx: Context) {
    const authUser = requireAuthUser(ctx);
    const userId = Number(authUser.id);

    if (!Number.isFinite(userId)) {
      throw new BadRequestError("无效的用户身份");
    }

    const body = validateBody(updateProfileBodySchema, ctx.request.body);
    const profile = await AuthService.updateProfile(userId, body);
    ctx.sendSuccess({ user: toAuthUserDto(profile) });
  }
}
