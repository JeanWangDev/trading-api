import { z } from "zod";
import { CANONICAL_INTERVALS, type CanonicalInterval } from "@/types/market";
import { isCanonicalInterval } from "@/exchanges/intervals";

export const klinesQuerySchema = z.object({
  exchange: z.string().min(1).optional(),
  symbol: z
    .string()
    .min(1, "symbol is required")
    .transform((value) => value.toUpperCase()),
  interval: z.custom<CanonicalInterval>(
    (val) => typeof val === "string" && isCanonicalInterval(val),
    {
      message: `interval must be one of: ${CANONICAL_INTERVALS.join(", ")}`,
    },
  ),
  startTime: z.coerce.number().int().nonnegative().optional(),
  endTime: z.coerce.number().int().nonnegative().optional(),
  limit: z.coerce.number().int().positive().max(1500).optional(),
});

export const searchSymbolsQuerySchema = z.object({
  exchange: z.string().min(1).optional(),
  query: z.string().optional().default(""),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export const symbolInfoQuerySchema = z.object({
  exchange: z.string().min(1).optional(),
  symbol: z
    .string()
    .min(1, "symbol is required")
    .transform((value) => value.toUpperCase()),
});

export const tickerQuerySchema = z.object({
  exchange: z.string().min(1).optional(),
  symbol: z
    .string()
    .min(1, "symbol is required")
    .transform((value) => value.toUpperCase()),
});

export type KlinesQuery = z.infer<typeof klinesQuerySchema>;
export type SearchSymbolsQuery = z.infer<typeof searchSymbolsQuerySchema>;
export type SymbolInfoQuery = z.infer<typeof symbolInfoQuerySchema>;
export type TickerQuery = z.infer<typeof tickerQuerySchema>;

export const priceLevelsQuerySchema = z.object({
  exchange: z.string().min(1).optional(),
  symbol: z
    .string()
    .min(1, "symbol is required")
    .transform((value) => value.toUpperCase()),
  interval: z.custom<CanonicalInterval>(
    (val) => typeof val === "string" && isCanonicalInterval(val),
    {
      message: `interval must be one of: ${CANONICAL_INTERVALS.join(", ")}`,
    },
  ),
  limit: z.coerce.number().int().min(1).max(5).optional().default(3),
});

export type PriceLevelsQuery = z.infer<typeof priceLevelsQuerySchema>;

export const marketBriefQuerySchema = z.object({
  exchange: z.string().min(1).optional(),
  symbol: z
    .string()
    .min(1, "symbol is required")
    .transform((value) => value.toUpperCase()),
  interval: z.custom<CanonicalInterval>(
    (val) => typeof val === "string" && isCanonicalInterval(val),
    {
      message: `interval must be one of: ${CANONICAL_INTERVALS.join(", ")}`,
    },
  ),
});

export type MarketBriefQuery = z.infer<typeof marketBriefQuerySchema>;

export function formatZodError(error: z.ZodError): string {
  return error.issues.map((issue) => issue.message).join("; ");
}
