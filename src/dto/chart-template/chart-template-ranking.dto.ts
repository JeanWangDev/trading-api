import type { ChartTemplateRankingRecord } from "@/types/chart-template-usage";
import { toChartTemplateDto, type ChartTemplateDto } from "./chart-template.dto";

export type ChartTemplateRankingDto = {
  rank: number;
  applyCount: number;
  copyCount: number;
  score: number;
  template: ChartTemplateDto;
};

export function toChartTemplateRankingDto(
  record: ChartTemplateRankingRecord,
): ChartTemplateRankingDto {
  return {
    rank: record.rank,
    applyCount: record.applyCount,
    copyCount: record.copyCount,
    score: record.score,
    template: toChartTemplateDto({
      id: record.templateId,
      name: record.name,
      symbolId: record.symbolId,
      symbol: record.symbol,
      indicatorIds: record.indicatorIds,
      visibility: record.visibility,
      isDefault: record.isDefault,
      isOfficial: record.isOfficial,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    }),
  };
}
