import type { ChartTemplateRecord } from "@/types/chart-template";

export type ChartTemplateDto = {
  id: string;
  name: string;
  symbolId: number | null;
  symbol: string;
  indicatorIds: string[];
  visibility: "private" | "public";
  isDefault: boolean;
  isOfficial: boolean;
  createdAt: number;
  updatedAt: number;
};

export function toChartTemplateDto(record: ChartTemplateRecord): ChartTemplateDto {
  return {
    id: record.id,
    name: record.name,
    symbolId: record.symbolId,
    symbol: record.symbol,
    indicatorIds: record.indicatorIds,
    visibility: record.visibility,
    isDefault: record.isDefault,
    isOfficial: record.isOfficial,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}
