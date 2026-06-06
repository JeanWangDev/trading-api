import type { Context } from "koa";
import { toChartTemplateDto, toChartTemplateRankingDto } from "@/dto/chart-template";
import { BadRequestError } from "@/errors/app-error";
import { requireAuthUser } from "@/middlewares/auth.middleware";
import { ChartTemplateService } from "@/services/chart-template";
import { ChartTemplateUsageService } from "@/services/chart-template/chart-template-usage.service";
import { verifyAccessToken } from "@/utils/jwt";
import {
  chartTemplateRankingsQuerySchema,
  chartTemplateSymbolQuerySchema,
  createChartTemplateBodySchema,
  formatZodError,
  removeChartTemplateBodySchema,
  setDefaultChartTemplateBodySchema,
  trackChartTemplateUsageBodySchema,
  updateChartTemplateBodySchema,
} from "@/validators/chart-template";

function parseUserId(ctx: Context): number {
  const authUser = requireAuthUser(ctx);
  const userId = Number(authUser.id);
  if (!Number.isFinite(userId) || userId <= 0) {
    throw new BadRequestError("无效的用户身份，请重新登录");
  }
  return userId;
}

function optionalUserId(ctx: Context): number | null {
  const header = ctx.get("authorization");
  if (!header.startsWith("Bearer ")) return null;

  const token = header.slice(7).trim();
  if (!token) return null;

  try {
    const user = verifyAccessToken(token);
    const userId = Number(user.id);
    return Number.isFinite(userId) && userId > 0 ? userId : null;
  } catch {
    return null;
  }
}

export class ChartTemplateController {
  static async listPublic(ctx: Context) {
    const parsed = chartTemplateSymbolQuerySchema.safeParse(ctx.query);
    if (!parsed.success) {
      throw new BadRequestError(formatZodError(parsed.error));
    }

    const rows = await ChartTemplateService.listPublic(parsed.data.symbol);
    ctx.sendSuccess({ data: rows.map(toChartTemplateDto) });
  }

  static async listMine(ctx: Context) {
    const userId = parseUserId(ctx);
    const parsed = chartTemplateSymbolQuerySchema.safeParse(ctx.query);
    if (!parsed.success) {
      throw new BadRequestError(formatZodError(parsed.error));
    }

    const rows = await ChartTemplateService.listMine(userId, parsed.data.symbol);
    ctx.sendSuccess({ data: rows.map(toChartTemplateDto) });
  }

  static async getDefault(ctx: Context) {
    const userId = parseUserId(ctx);
    const parsed = chartTemplateSymbolQuerySchema.safeParse(ctx.query);
    if (!parsed.success) {
      throw new BadRequestError(formatZodError(parsed.error));
    }
    if (!parsed.data.symbol) {
      throw new BadRequestError("symbol is required");
    }

    const row = await ChartTemplateService.getDefaultForUser(userId, parsed.data.symbol);
    ctx.sendSuccess(row ? toChartTemplateDto(row) : null);
  }

  static async getStarter(ctx: Context) {
    const row = await ChartTemplateService.getStarterTemplate();
    ctx.sendSuccess(row ? toChartTemplateDto(row) : null);
  }

  static async detail(ctx: Context) {
    const templateId = String(ctx.query.id ?? "").trim();
    if (!templateId) {
      throw new BadRequestError("缺少模版 id");
    }

    const userId = optionalUserId(ctx);
    const row = await ChartTemplateService.getAccessible(templateId, userId);
    ctx.sendSuccess(toChartTemplateDto(row));
  }

  static async create(ctx: Context) {
    const userId = parseUserId(ctx);
    const parsed = createChartTemplateBodySchema.safeParse(ctx.request.body);
    if (!parsed.success) {
      throw new BadRequestError(formatZodError(parsed.error));
    }

    const created = await ChartTemplateService.create(userId, parsed.data);
    ctx.sendSuccess(toChartTemplateDto(created), { message: "模版已保存" });
  }

  static async update(ctx: Context) {
    const userId = parseUserId(ctx);
    const parsed = updateChartTemplateBodySchema.safeParse(ctx.request.body);
    if (!parsed.success) {
      throw new BadRequestError(formatZodError(parsed.error));
    }

    const { id: templateId, ...input } = parsed.data;
    const updated = await ChartTemplateService.update(userId, templateId, input);
    ctx.sendSuccess(toChartTemplateDto(updated), { message: "模版已更新" });
  }

  static async setDefault(ctx: Context) {
    const userId = parseUserId(ctx);
    const parsed = setDefaultChartTemplateBodySchema.safeParse(ctx.request.body);
    if (!parsed.success) {
      throw new BadRequestError(formatZodError(parsed.error));
    }

    const updated = await ChartTemplateService.setDefault(userId, parsed.data.id);
    ctx.sendSuccess(toChartTemplateDto(updated), { message: "已设为默认模版" });
  }

  static async remove(ctx: Context) {
    const userId = parseUserId(ctx);
    const parsed = removeChartTemplateBodySchema.safeParse(ctx.request.body);
    if (!parsed.success) {
      throw new BadRequestError(formatZodError(parsed.error));
    }

    await ChartTemplateService.remove(userId, parsed.data.id);
    ctx.sendSuccess(null, { message: "模版已删除" });
  }

  static async rankings(ctx: Context) {
    const parsed = chartTemplateRankingsQuerySchema.safeParse(ctx.query);
    if (!parsed.success) {
      throw new BadRequestError(formatZodError(parsed.error));
    }

    const rows = await ChartTemplateUsageService.rankings(
      parsed.data.period,
      parsed.data.limit,
    );
    ctx.sendSuccess({
      period: parsed.data.period,
      items: rows.map(toChartTemplateRankingDto),
    });
  }

  static async track(ctx: Context) {
    const parsed = trackChartTemplateUsageBodySchema.safeParse(ctx.request.body);
    if (!parsed.success) {
      throw new BadRequestError(formatZodError(parsed.error));
    }

    const userId = optionalUserId(ctx);
    await ChartTemplateUsageService.record(parsed.data.id, parsed.data.event, userId);
    ctx.sendSuccess(null);
  }
}
