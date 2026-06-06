import { Op, Sequelize, type WhereOptions } from "sequelize";
import { Event } from "@/db/models/events";
import { NotFoundError } from "@/errors/app-error";
import type { EventListResult, EventRecord } from "@/types/event";
import { resolvePrimarySymbol } from "@/utils/event-symbols";
import { emitEventCreated } from "@/ws/events-bus";

const PUBLISHED = 1;

/** 仅展示已绑定主币种的事件 */
const HAS_PRIMARY_SYMBOL = Sequelize.literal(
  "JSON_LENGTH(COALESCE(f_symbols, JSON_ARRAY())) > 0",
);

function mapRow(row: Event): EventRecord {
  const symbols = Array.isArray(row.symbols)
    ? (row.symbols as string[]).map((s) => String(s).toUpperCase())
    : [];
  const primarySymbol = symbols[0] ?? "";

  return {
    id: row.eventId,
    source: row.source,
    type: row.type,
    title: row.title,
    description: row.description ?? "",
    url: row.url,
    cover: row.cover,
    symbols,
    primarySymbol,
    sentiment: row.sentiment,
    impact: row.impact,
    publishedAt: Number(row.publishedAt),
    ingestedAt: Number(row.ingestedAt),
  };
}

function toWsPayload(record: EventRecord) {
  return {
    id: record.id,
    source: record.source,
    type: record.type,
    title: record.title,
    symbols: record.symbols,
    primarySymbol: record.primarySymbol,
    sentiment: record.sentiment,
    impact: record.impact,
    publishedAt: record.publishedAt,
  };
}

function normalizeInputSymbols(symbols?: string[]): string[] | null {
  const primary = resolvePrimarySymbol(...(symbols ?? []));
  return primary ? [primary] : null;
}

export type UpsertEventInput = {
  eventId: string;
  source: string;
  externalId: string;
  type: string;
  title: string;
  description?: string;
  url?: string;
  cover?: string;
  symbols?: string[];
  sentiment?: string;
  impact?: number;
  publishedAt: number;
};

export class EventService {
  static async upsert(input: UpsertEventInput): Promise<"created" | "skipped"> {
    const boundSymbols = normalizeInputSymbols(input.symbols);
    if (!boundSymbols) {
      return "skipped";
    }

    const existing = await Event.findOne({
      where: { source: input.source, externalId: input.externalId },
    });

    if (existing) {
      return "skipped";
    }

    const now = Date.now();

    await Event.create({
      eventId: input.eventId,
      source: input.source,
      externalId: input.externalId,
      type: input.type,
      title: input.title,
      description: input.description ?? "",
      url: input.url ?? "",
      cover: input.cover ?? "",
      symbols: boundSymbols,
      sentiment: input.sentiment ?? "neutral",
      impact: input.impact ?? 0,
      status: PUBLISHED,
      publishedAt: input.publishedAt,
      ingestedAt: now,
    });

    emitEventCreated(
      toWsPayload({
        id: input.eventId,
        source: input.source,
        type: input.type,
        title: input.title,
        description: input.description ?? "",
        url: input.url ?? "",
        cover: input.cover ?? "",
        symbols: boundSymbols,
        primarySymbol: boundSymbols[0],
        sentiment: input.sentiment ?? "neutral",
        impact: input.impact ?? 0,
        publishedAt: input.publishedAt,
        ingestedAt: now,
      }),
    );

    return "created";
  }

  static async batchUpsert(
    inputs: UpsertEventInput[],
  ): Promise<{ created: number; skipped: number }> {
    const normalized = inputs
      .map((input) => {
        const boundSymbols = normalizeInputSymbols(input.symbols);
        if (!boundSymbols) return null;
        return { ...input, symbols: boundSymbols };
      })
      .filter((item): item is UpsertEventInput & { symbols: string[] } => item !== null);

    if (normalized.length === 0) {
      return { created: 0, skipped: inputs.length };
    }

    const pairs = normalized.map((i) => ({ source: i.source, externalId: i.externalId }));
    const existingRows = await Event.findAll({
      where: { [Op.or]: pairs },
      attributes: ["source", "externalId"],
    });
    const existingKeys = new Set(
      existingRows.map((r) => `${r.source}:${r.externalId}`),
    );

    const toCreate = normalized.filter(
      (i) => !existingKeys.has(`${i.source}:${i.externalId}`),
    );
    const skipped = inputs.length - toCreate.length;

    if (toCreate.length === 0) {
      return { created: 0, skipped };
    }

    const now = Date.now();
    await Event.bulkCreate(
      toCreate.map((input) => ({
        eventId: input.eventId,
        source: input.source,
        externalId: input.externalId,
        type: input.type,
        title: input.title,
        description: input.description ?? "",
        url: input.url ?? "",
        cover: input.cover ?? "",
        symbols: input.symbols,
        sentiment: input.sentiment ?? "neutral",
        impact: input.impact ?? 0,
        status: PUBLISHED,
        publishedAt: input.publishedAt,
        ingestedAt: now,
      })),
    );

    const createdRows = await Event.findAll({
      where: { eventId: { [Op.in]: toCreate.map((i) => i.eventId) } },
    });

    for (const row of createdRows) {
      emitEventCreated(toWsPayload(mapRow(row)));
    }

    return { created: toCreate.length, skipped };
  }

  static async list(params: {
    page: number;
    pageSize: number;
    type?: string;
    source?: string;
    symbol?: string;
  }): Promise<EventListResult> {
    const page = Math.max(1, params.page);
    const pageSize = Math.min(50, Math.max(1, params.pageSize));

    const andClauses: Array<ReturnType<typeof Sequelize.literal>> = [HAS_PRIMARY_SYMBOL];

    if (params.symbol?.trim()) {
      const sym = params.symbol.trim().toUpperCase().replace(/USDT$/i, "").replace(/"/g, "");
      andClauses.push(
        Sequelize.literal(`JSON_UNQUOTE(JSON_EXTRACT(f_symbols, '$[0]')) = '${sym}'`),
      );
    }

    const where: WhereOptions = {
      status: PUBLISHED,
      [Op.and]: andClauses,
    };

    if (params.type?.trim()) {
      Object.assign(where, { type: params.type.trim() });
    }

    if (params.source?.trim()) {
      Object.assign(where, { source: params.source.trim() });
    }

    const { rows, count } = await Event.findAndCountAll({
      where,
      order: [["publishedAt", "DESC"]],
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });

    return {
      data: rows.map(mapRow),
      total: count,
      page,
      pageSize,
    };
  }

  static async listForChart(params: {
    symbol: string;
    from: number;
    to: number;
    limit?: number;
  }): Promise<EventRecord[]> {
    const sym = params.symbol.trim().toUpperCase().replace(/USDT$/i, "").replace(/"/g, "");
    const limit = Math.min(100, Math.max(1, params.limit ?? 50));

    const rows = await Event.findAll({
      where: {
        status: PUBLISHED,
        publishedAt: { [Op.between]: [params.from, params.to] },
        [Op.and]: [
          HAS_PRIMARY_SYMBOL,
          Sequelize.literal(`JSON_UNQUOTE(JSON_EXTRACT(f_symbols, '$[0]')) = '${sym}'`),
        ],
      },
      order: [["publishedAt", "ASC"]],
      limit,
    });

    return rows.map(mapRow);
  }

  static async listRecent(limit = 10): Promise<EventRecord[]> {
    const rows = await Event.findAll({
      where: {
        status: PUBLISHED,
        [Op.and]: [HAS_PRIMARY_SYMBOL],
      },
      order: [["publishedAt", "DESC"]],
      limit: Math.min(50, Math.max(1, limit)),
    });

    return rows.map(mapRow);
  }

  static async listSince(sinceMs: number, limit = 30): Promise<EventRecord[]> {
    const rows = await Event.findAll({
      where: {
        status: PUBLISHED,
        ingestedAt: { [Op.gte]: sinceMs },
        [Op.and]: [HAS_PRIMARY_SYMBOL],
      },
      order: [["ingestedAt", "ASC"]],
      limit: Math.min(50, Math.max(1, limit)),
    });

    return rows.map(mapRow);
  }

  static async getById(eventId: string): Promise<EventRecord> {
    const row = await Event.findOne({
      where: {
        eventId,
        status: PUBLISHED,
        [Op.and]: [HAS_PRIMARY_SYMBOL],
      },
    });

    if (!row) {
      throw new NotFoundError("事件不存在或未发布");
    }

    return mapRow(row);
  }

  static async countPublished(): Promise<number> {
    return Event.count({
      where: {
        status: PUBLISHED,
        [Op.and]: [HAS_PRIMARY_SYMBOL],
      },
    });
  }

  static async countByType(type: string, sinceMs?: number): Promise<number> {
    const where: WhereOptions = {
      status: PUBLISHED,
      type,
      [Op.and]: [HAS_PRIMARY_SYMBOL],
    };
    if (sinceMs) {
      Object.assign(where, { publishedAt: { [Op.gte]: sinceMs } });
    }
    return Event.count({ where });
  }
}
