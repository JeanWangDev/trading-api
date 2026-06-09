import { z } from "zod";

const nullableTrimmedString = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((value) => (value ? value : null));

const decimalStringSchema = z
  .union([z.string(), z.number()])
  .transform((value) => String(value).trim())
  .refine((value) => value !== "" && Number.isFinite(Number(value)), {
    message: "请输入有效数字",
  });

export const chainOrderStatusSchema = z.enum([
  "submitted",
  "confirmed",
  "failed",
  "closed",
  "cancelled",
]);

export const upsertChainOrderBodySchema = z.object({
  orderId: nullableTrimmedString(64),
  walletAddress: z.string().trim().regex(/^0x[a-fA-F0-9]{40}$/, "钱包地址无效"),
  chain: z.string().trim().min(1).max(32).optional().default("bsc-testnet"),
  chainId: z.string().trim().min(1).max(16).optional().default("0x61"),
  protocol: z.string().trim().min(1).max(64).optional().default("mock-perp"),
  contractAddress: nullableTrimmedString(64),
  txHash: z.string().trim().regex(/^0x[a-fA-F0-9]{64}$/, "交易 hash 无效"),
  txStatus: chainOrderStatusSchema.optional(),
  receiptStatus: nullableTrimmedString(8),
  blockNumber: nullableTrimmedString(32),
  symbol: z
    .string()
    .trim()
    .min(1)
    .max(32)
    .transform((value) => value.toUpperCase()),
  pairLabel: z.string().trim().max(96).optional().default(""),
  marketType: z.enum(["perp", "spot"]).optional().default("perp"),
  side: z.enum(["long", "short"]),
  orderType: z.enum(["market", "limit"]).optional().default("market"),
  marginUsdt: decimalStringSchema,
  leverage: decimalStringSchema,
  leverageX100: z.coerce.number().int().positive().optional().nullable(),
  notionalUsdt: decimalStringSchema.optional().nullable(),
  slippagePercent: decimalStringSchema.optional().nullable(),
  entryPrice: decimalStringSchema.optional().nullable(),
  strategyId: nullableTrimmedString(64),
  strategyName: nullableTrimmedString(128),
  agentId: nullableTrimmedString(64),
  agentName: nullableTrimmedString(128),
  signalId: nullableTrimmedString(64),
  source: z.string().trim().min(1).max(32).optional().default("web"),
  rawOrder: z.unknown().optional().nullable(),
  rawReceipt: z.unknown().optional().nullable(),
});

export const listChainOrdersQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  beforeId: z.coerce.number().int().positive().optional(),
  status: chainOrderStatusSchema.optional(),
  chain: z.string().trim().min(1).max(32).optional(),
  symbol: z
    .string()
    .trim()
    .min(1)
    .max(32)
    .optional()
    .transform((value) => (value ? value.toUpperCase() : undefined)),
  strategyId: z.string().trim().min(1).max(64).optional(),
});

export const chainOrderIdParamSchema = z.object({
  orderId: z.string().trim().min(1).max(64),
});

export type UpsertChainOrderBody = z.infer<typeof upsertChainOrderBodySchema>;
export type ListChainOrdersQuery = z.infer<typeof listChainOrdersQuerySchema>;
