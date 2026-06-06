export type TemplateVisibility = "private" | "public";

export type ChartTemplateRecord = {
  id: string;
  name: string;
  symbolId: number | null;
  symbol: string;
  indicatorIds: string[];
  visibility: TemplateVisibility;
  isDefault: boolean;
  isOfficial: boolean;
  createdAt: number;
  updatedAt: number;
};

export const VISIBILITY_PRIVATE = 0;
export const VISIBILITY_PUBLIC = 1;
