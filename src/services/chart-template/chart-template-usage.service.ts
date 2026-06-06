import { QueryTypes } from "sequelize";
import { OFFICIAL_TEMPLATE_USER_ID } from "@/constants/chart-template";
import { getSequelize } from "@/db/connection";
import { ChartTemplate } from "@/db/models/chart-template";
import { ChartTemplateUsage } from "@/db/models/chart-template/chart-template-usage.model";
import { NotFoundError } from "@/errors/app-error";
import type { ChartTemplateRankingRecord, TemplateRankingPeriod } from "@/types/chart-template-usage";
import {
  TEMPLATE_USAGE_APPLY,
  TEMPLATE_USAGE_COPY,
  type TemplateUsageEventType,
} from "@/types/chart-template-usage";
import { VISIBILITY_PUBLIC } from "@/types/chart-template";
import { Op } from "sequelize";

const ACTIVE = 1;
const MS_DAY = 86_400_000;

function periodStart(period: TemplateRankingPeriod): Date {
  const days = period === "week" ? 7 : 30;
  return new Date(Date.now() - days * MS_DAY);
}

function startOfUtcDay(date = new Date()): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

type RankingAggregateRow = {
  templateId: string;
  applyCount: string | number;
  copyCount: string | number;
  score: string | number;
};

export class ChartTemplateUsageService {
  static async record(
    templateId: string,
    eventType: TemplateUsageEventType,
    userId: number | null,
  ): Promise<void> {
    const row = await ChartTemplate.findOne({
      where: { templateId, status: ACTIVE, visibility: VISIBILITY_PUBLIC },
    });

    if (!row) {
      throw new NotFoundError("模版不存在或未公开");
    }

    if (userId != null && userId > 0 && eventType === TEMPLATE_USAGE_APPLY) {
      const dayStart = startOfUtcDay();
      const existing = await ChartTemplateUsage.findOne({
        where: {
          templateId,
          userId,
          eventType: TEMPLATE_USAGE_APPLY,
          createTime: { [Op.gte]: dayStart },
        },
      });
      if (existing) {
        return;
      }
    }

    await ChartTemplateUsage.create({
      templateId,
      userId: userId != null && userId > 0 ? userId : null,
      eventType,
      createTime: new Date(),
    });
  }

  static async rankings(
    period: TemplateRankingPeriod,
    limit: number,
  ): Promise<ChartTemplateRankingRecord[]> {
    const sequelize = await getSequelize();
    if (!sequelize) {
      return [];
    }

    const since = periodStart(period);
    const safeLimit = Math.min(10, Math.max(1, limit));

    const rows = await sequelize.query<RankingAggregateRow>(
      `
      SELECT
        u.f_template_id AS templateId,
        SUM(CASE WHEN u.f_event_type = 'apply' THEN 1 ELSE 0 END) AS applyCount,
        SUM(CASE WHEN u.f_event_type = 'copy' THEN 1 ELSE 0 END) AS copyCount,
        COUNT(*) AS score
      FROM t_chart_template_usage u
      INNER JOIN t_chart_template t
        ON t.f_template_id = u.f_template_id
        AND t.f_status = 1
        AND t.f_visibility = 1
      WHERE u.f_create_time >= :since
      GROUP BY u.f_template_id
      ORDER BY score DESC, applyCount DESC, copyCount DESC
      LIMIT :safeLimit
      `,
      {
        replacements: { since, safeLimit },
        type: QueryTypes.SELECT,
      },
    );

    if (rows.length === 0) {
      return [];
    }

    const templateIds = rows.map((r) => r.templateId);
    const templates = await ChartTemplate.findAll({
      where: {
        templateId: { [Op.in]: templateIds },
        status: ACTIVE,
        visibility: VISIBILITY_PUBLIC,
      },
    });

    const byId = new Map(templates.map((t) => [t.templateId, t]));

    const result: ChartTemplateRankingRecord[] = [];
    let rank = 0;

    for (const agg of rows) {
      const template = byId.get(agg.templateId);
      if (!template) continue;

      rank += 1;
      const indicatorIds = Array.isArray(template.indicatorIds)
        ? (template.indicatorIds as string[]).map(String)
        : [];

      result.push({
        rank,
        templateId: template.templateId,
        applyCount: Number(agg.applyCount) || 0,
        copyCount: Number(agg.copyCount) || 0,
        score: Number(agg.score) || 0,
        name: template.name,
        symbolId: template.symbolId ?? null,
        symbol: template.symbol ?? "",
        indicatorIds,
        visibility: "public",
        isDefault: template.isDefault === 1,
        isOfficial: template.userId === OFFICIAL_TEMPLATE_USER_ID,
        createdAt: template.createTime?.getTime() ?? Date.now(),
        updatedAt: template.updateTime?.getTime() ?? Date.now(),
      });
    }

    return result;
  }
}
