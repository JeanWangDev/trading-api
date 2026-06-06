import { z } from "zod";

export const eventsListQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(50).optional().default(20),
  type: z.string().trim().optional(),
  source: z.string().trim().optional(),
  symbol: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v.toUpperCase() : undefined)),
});

export type EventsListQuery = z.infer<typeof eventsListQuerySchema>;

export const eventsChartQuerySchema = z.object({
  symbol: z.string().trim().min(1),
  from: z.coerce.number().int().positive(),
  to: z.coerce.number().int().positive(),
  limit: z.coerce.number().int().positive().max(100).optional().default(50),
});

export const eventsRecentQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(50).optional().default(10),
});

export function formatZodError(error: z.ZodError): string {
  return error.issues.map((issue) => issue.message).join("；");
}
