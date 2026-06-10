import { z } from "zod";

const numberSchema = z.coerce.number().finite();
const positiveNumberSchema = numberSchema.positive();
const nonNegativeNumberSchema = numberSchema.min(0);

const csvListSchema = z
  .union([z.string(), z.array(z.string())])
  .transform((value) => (Array.isArray(value) ? value : value.split(",")))
  .transform((items) => items.map((item) => item.trim().toLowerCase()).filter(Boolean))
  .refine((items) => items.length > 0, "至少配置一个允许项")
  .refine((items) => items.every((item) => /^[a-z0-9_-]+$/.test(item)), "允许项只能包含字母、数字、下划线和短横线");

export const updateChainOrderRiskConfigBodySchema = z
  .object({
    riskEnabled: z.boolean().optional(),
    minMarginUsdt: positiveNumberSchema.optional(),
    maxMarginUsdt: positiveNumberSchema.optional(),
    minLeverage: positiveNumberSchema.optional(),
    maxLeverage: positiveNumberSchema.optional(),
    maxNotionalUsdt: positiveNumberSchema.optional(),
    maxSlippagePercent: nonNegativeNumberSchema.optional(),
    dailyOrderLimit: z.coerce.number().int().min(0).optional(),
    allowedChains: csvListSchema.optional(),
    allowedProtocols: csvListSchema.optional(),
  })
  .refine(
    (value) =>
      value.riskEnabled !== undefined ||
      value.minMarginUsdt !== undefined ||
      value.maxMarginUsdt !== undefined ||
      value.minLeverage !== undefined ||
      value.maxLeverage !== undefined ||
      value.maxNotionalUsdt !== undefined ||
      value.maxSlippagePercent !== undefined ||
      value.dailyOrderLimit !== undefined ||
      value.allowedChains !== undefined ||
      value.allowedProtocols !== undefined,
    { message: "至少提供一个配置项" },
  )
  .refine(
    (value) =>
      value.minMarginUsdt === undefined ||
      value.maxMarginUsdt === undefined ||
      value.minMarginUsdt <= value.maxMarginUsdt,
    { message: "最小保证金不能大于最大保证金" },
  )
  .refine(
    (value) =>
      value.minLeverage === undefined ||
      value.maxLeverage === undefined ||
      value.minLeverage <= value.maxLeverage,
    { message: "最小杠杆不能大于最大杠杆" },
  );

export type UpdateChainOrderRiskConfigBody = z.infer<typeof updateChainOrderRiskConfigBodySchema>;
