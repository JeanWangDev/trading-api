import { z } from "zod";

export function formatZodError(error: z.ZodError): string {
  return error.issues.map((issue) => issue.message).join("；");
}

const accessTierSchema = z.union([z.literal(0), z.literal(1)]);

export const createTradingSymbolBodySchema = z.object({
  baseAsset: z.string().trim().min(1).max(16),
  symbol: z
    .string()
    .trim()
    .min(1)
    .max(32)
    .transform((v) => v.toUpperCase()),
  exchange: z.string().trim().min(1).max(32).optional().default("binance"),
  displayName: z.string().trim().max(64).optional().default(""),
  sortOrder: z.number().int().min(0).max(99999).optional().default(0),
  isDefault: z.boolean().optional().default(false),
  accessTier: accessTierSchema.optional().default(0),
  status: z.union([z.literal(0), z.literal(1)]).optional().default(1),
});

export const updateTradingSymbolBodySchema = z
  .object({
    id: z.number().int().positive(),
    baseAsset: z.string().trim().min(1).max(16).optional(),
    symbol: z
      .string()
      .trim()
      .min(1)
      .max(32)
      .optional()
      .transform((v) => (v === undefined ? undefined : v.toUpperCase())),
    exchange: z.string().trim().min(1).max(32).optional(),
    displayName: z.string().trim().max(64).optional(),
    sortOrder: z.number().int().min(0).max(99999).optional(),
    isDefault: z.boolean().optional(),
    accessTier: accessTierSchema.optional(),
    status: z.union([z.literal(0), z.literal(1)]).optional(),
  })
  .refine(
    (body) =>
      body.baseAsset !== undefined ||
      body.symbol !== undefined ||
      body.exchange !== undefined ||
      body.displayName !== undefined ||
      body.sortOrder !== undefined ||
      body.isDefault !== undefined ||
      body.accessTier !== undefined ||
      body.status !== undefined,
    { message: "至少提供一个要更新的字段" },
  );

export const removeTradingSymbolBodySchema = z.object({
  id: z.number().int().positive(),
});
