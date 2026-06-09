import { z } from "zod";
import { STRATEGY_KEY_PATTERN } from "@/constants/strategy";

const visibilitySchema = z.enum(["draft", "public"]);

const strategyKeySchema = z
  .string()
  .trim()
  .toLowerCase()
  .refine((v) => STRATEGY_KEY_PATTERN.test(v), {
    message: "策略标识仅支持 3–20 位小写字母、数字或下划线",
  });

export const createStrategyBodySchema = z.object({
  strategyKey: strategyKeySchema,
  name: z.string().trim().min(1, "策略名称不能为空").max(64),
  summary: z.string().trim().max(255).optional().default(""),
  description: z.string().trim().min(1, "策略描述不能为空"),
  symbol: z
    .string()
    .trim()
    .max(32)
    .transform((v) => v.toUpperCase()),
  interval: z.string().trim().min(1).max(16),
  templateId: z.string().trim().max(64).optional().nullable(),
  tags: z.array(z.string().trim().min(1)).max(8).optional().default([]),
  followFeeUsdt: z.coerce.number().min(0).max(99999).optional().default(0),
  durationDays: z.coerce.number().int().min(1).max(365).optional().default(30),
  visibility: visibilitySchema.optional().default("draft"),
});

export const updateStrategyBodySchema = z
  .object({
    strategyKey: strategyKeySchema,
    name: z.string().trim().min(1).max(64).optional(),
    summary: z.string().trim().max(255).optional(),
    description: z.string().trim().min(1).optional(),
    symbol: z
      .string()
      .trim()
      .max(32)
      .optional()
      .transform((v) => (v === undefined ? undefined : v.toUpperCase())),
    interval: z.string().trim().min(1).max(16).optional(),
    templateId: z.string().trim().max(64).optional().nullable(),
    tags: z.array(z.string().trim().min(1)).max(8).optional(),
    followFeeUsdt: z.coerce.number().min(0).max(99999).optional(),
    durationDays: z.coerce.number().int().min(1).max(365).optional(),
    visibility: visibilitySchema.optional(),
  })
  .refine(
    (body) =>
      body.name !== undefined ||
      body.summary !== undefined ||
      body.description !== undefined ||
      body.symbol !== undefined ||
      body.interval !== undefined ||
      body.templateId !== undefined ||
      body.tags !== undefined ||
      body.followFeeUsdt !== undefined ||
      body.durationDays !== undefined ||
      body.visibility !== undefined,
    { message: "至少提供一个要更新的字段" },
  );

export const strategyMineQuerySchema = z.object({
  scope: z.enum(["published", "following"]).optional().default("following"),
});

export function formatZodError(error: z.ZodError): string {
  return error.issues.map((issue) => issue.message).join("；");
}
