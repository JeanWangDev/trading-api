import type { Context } from "koa";
import { toEventDetailDto, toEventListItemDto } from "@/dto/events";
import { BadRequestError } from "@/errors/app-error";
import { EventService } from "@/services/events";
import {
  eventsChartQuerySchema,
  eventsListQuerySchema,
  eventsRecentQuerySchema,
  formatZodError,
} from "@/validators/events";

export class EventsController {
  static async list(ctx: Context) {
    const parsed = eventsListQuerySchema.safeParse(ctx.query);

    if (!parsed.success) {
      throw new BadRequestError(formatZodError(parsed.error));
    }

    const result = await EventService.list(parsed.data);

    ctx.set("Cache-Control", "public, max-age=30, s-maxage=30");
    ctx.sendSuccess({
      data: result.data.map(toEventListItemDto),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    });
  }

  static async chart(ctx: Context) {
    const parsed = eventsChartQuerySchema.safeParse(ctx.query);
    if (!parsed.success) {
      throw new BadRequestError(formatZodError(parsed.error));
    }

    const { from, to } = parsed.data;
    if (from >= to) {
      throw new BadRequestError("from 必须小于 to（毫秒时间戳）");
    }

    const events = await EventService.listForChart(parsed.data);
    ctx.set("Cache-Control", "public, max-age=60, s-maxage=60");
    ctx.sendSuccess({ data: events.map(toEventListItemDto) });
  }

  static async recent(ctx: Context) {
    const parsed = eventsRecentQuerySchema.safeParse(ctx.query);
    if (!parsed.success) {
      throw new BadRequestError(formatZodError(parsed.error));
    }

    const events = await EventService.listRecent(parsed.data.limit);
    ctx.set("Cache-Control", "public, max-age=30, s-maxage=30");
    ctx.sendSuccess({ data: events.map(toEventListItemDto) });
  }

  static async getById(ctx: Context) {
    const id = String(ctx.params.id ?? "").trim();

    if (!id) {
      throw new BadRequestError("缺少事件 id");
    }

    const event = await EventService.getById(id);
    ctx.set("Cache-Control", "public, max-age=60, s-maxage=60");
    ctx.sendSuccess(toEventDetailDto(event));
  }
}
