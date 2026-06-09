import type { Context } from "koa";
import { toOwnedStrategyDto, toStrategyDto } from "@/dto/strategy";
import { BadRequestError } from "@/errors/app-error";
import { requireAuthUser } from "@/middlewares/auth.middleware";
import { optionalAuthUser } from "@/middlewares/optional-auth.middleware";
import { StrategyCatalogService } from "@/services/strategy";
import { StrategyCreatorService } from "@/services/strategy/strategy-creator.service";
import {
  createStrategyBodySchema,
  formatZodError,
  strategyMineQuerySchema,
  updateStrategyBodySchema,
} from "@/validators/strategy";

function parseUserId(ctx: Context): number {
  const authUser = requireAuthUser(ctx);
  const userId = Number(authUser.id);
  if (!Number.isFinite(userId) || userId <= 0) {
    throw new BadRequestError("无效的用户身份");
  }
  return userId;
}

export class StrategyController {
  static async list(ctx: Context) {
    const authUser = optionalAuthUser(ctx);
    const userId = authUser ? Number(authUser.id) : null;
    const rows = await StrategyCatalogService.listActive(
      Number.isFinite(userId) ? userId : null,
    );
    ctx.sendSuccess({
      strategies: rows.map(({ row, plan, access, creator, stats }) =>
        toStrategyDto(row, plan, access, creator, stats),
      ),
    });
  }

  static async create(ctx: Context) {
    const userId = parseUserId(ctx);
    const parsed = createStrategyBodySchema.safeParse(ctx.request.body);
    if (!parsed.success) {
      throw new BadRequestError(formatZodError(parsed.error));
    }

    const row = await StrategyCreatorService.create(userId, parsed.data);
    ctx.sendSuccess({
      strategy: toOwnedStrategyDto(
        row,
        null,
        { subscribed: false, endsAt: null },
        "",
      ),
    });
  }

  static async update(ctx: Context) {
    const userId = parseUserId(ctx);
    const parsed = updateStrategyBodySchema.safeParse(ctx.request.body);
    if (!parsed.success) {
      throw new BadRequestError(formatZodError(parsed.error));
    }

    const { strategyKey, ...input } = parsed.data;
    const row = await StrategyCreatorService.update(userId, strategyKey, input);
    ctx.sendSuccess({
      strategy: toOwnedStrategyDto(
        row,
        null,
        { subscribed: false, endsAt: null },
        "",
      ),
    });
  }

  static async mine(ctx: Context) {
    const userId = parseUserId(ctx);
    const parsed = strategyMineQuerySchema.safeParse(ctx.query);
    if (!parsed.success) {
      throw new BadRequestError(formatZodError(parsed.error));
    }

    const authUser = requireAuthUser(ctx);
    const rows = await StrategyCatalogService.listMine(userId, parsed.data.scope);
    ctx.sendSuccess({
      strategies: rows.map(({ row, plan, access, creator }) => {
        const dto = toStrategyDto(row, plan, access, creator);
        if (parsed.data.scope === "published") {
          return { ...dto, isOwner: true };
        }
        return dto;
      }),
      scope: parsed.data.scope,
      creatorNickname: authUser.nickname,
    });
  }

  static async detail(ctx: Context) {
    const strategyKey = String(ctx.params.strategyKey ?? "").trim();
    if (!strategyKey) {
      throw new BadRequestError("策略标识无效");
    }

    const authUser = optionalAuthUser(ctx);
    const userId = authUser ? Number(authUser.id) : null;
    const { row, plan, access, creator, stats } = await StrategyCatalogService.getByKey(
      strategyKey,
      Number.isFinite(userId) ? userId : null,
    );

    const isOwner = userId != null && row.userId === userId;
    const dto = isOwner
      ? { ...toOwnedStrategyDto(row, plan, access, authUser?.nickname ?? ""), stats }
      : toStrategyDto(row, plan, access, creator, stats);

    ctx.sendSuccess({ strategy: dto });
  }

  static async stats(ctx: Context) {
    const strategyKey = String(ctx.params.strategyKey ?? "").trim();
    if (!strategyKey) {
      throw new BadRequestError("策略标识无效");
    }
    const data = await StrategyCatalogService.getStats(strategyKey);
    ctx.sendSuccess({ stats: data });
  }

  static async signal(ctx: Context) {
    const authUser = optionalAuthUser(ctx) ?? requireAuthUser(ctx);
    const userId = Number(authUser.id);
    if (!Number.isFinite(userId)) {
      throw new BadRequestError("无效的用户身份");
    }

    const strategyKey = String(ctx.params.strategyKey ?? "").trim();
    if (!strategyKey) {
      throw new BadRequestError("策略标识无效");
    }

    const data = await StrategyCatalogService.getSignal(strategyKey, userId);
    ctx.sendSuccess(data);
  }
}
