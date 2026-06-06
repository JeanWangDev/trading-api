import { z } from "zod";

const visibilitySchema = z.enum(["private", "public"]);

export const createChartTemplateBodySchema = z.object({
  name: z.string().trim().min(1, "模版名称不能为空").max(128),
  symbolId: z.number().int().positive().optional().nullable(),
  symbol: z
    .string()
    .trim()
    .max(32)
    .optional()
    .transform((v) => (v ? v.toUpperCase() : "")),
  indicatorIds: z.array(z.string().trim().min(1)).min(1, "至少选择一个指标").max(32),
  visibility: visibilitySchema.optional().default("private"),
  isDefault: z.boolean().optional().default(false),
});

export const updateChartTemplateBodySchema = z
  .object({
    id: z.string().trim().min(1, "缺少模版 id"),
    name: z.string().trim().min(1).max(128).optional(),
    symbolId: z.number().int().positive().optional().nullable(),
    symbol: z
      .string()
      .trim()
      .max(32)
      .optional()
      .transform((v) => (v === undefined ? undefined : v.toUpperCase())),
    indicatorIds: z.array(z.string().trim().min(1)).min(1).max(32).optional(),
    visibility: visibilitySchema.optional(),
  })
  .refine(
    (body) =>
      body.name !== undefined ||
      body.symbolId !== undefined ||
      body.symbol !== undefined ||
      body.indicatorIds !== undefined ||
      body.visibility !== undefined,
    { message: "至少提供一个要更新的字段" },
  );

export const removeChartTemplateBodySchema = z.object({
  id: z.string().trim().min(1, "缺少模版 id"),
});

export const setDefaultChartTemplateBodySchema = z.object({
  id: z.string().trim().min(1, "缺少模版 id"),
});

export const trackChartTemplateUsageBodySchema = z.object({
  id: z.string().trim().min(1, "缺少模版 id"),
  event: z.enum(["apply", "copy"]),
});

export const chartTemplateRankingsQuerySchema = z.object({
  period: z.enum(["week", "month"]).optional().default("week"),
  limit: z.coerce.number().int().min(1).max(10).optional().default(5),
});

/** 按交易对筛选模版列表 / 查询默认模版 */
export const chartTemplateSymbolQuerySchema = z.object({
  symbol: z
    .string()
    .trim()
    .min(1)
    .max(32)
    .optional()
    .transform((v) => (v ? v.toUpperCase() : undefined)),
});

export type ChartTemplateSymbolQuery = z.infer<typeof chartTemplateSymbolQuerySchema>;

export function formatZodError(error: z.ZodError): string {
  return error.issues.map((issue) => issue.message).join("；");
}
