import { z } from "zod";

export const createBillingOrderBodySchema = z.object({
  planKey: z.string().trim().min(1, "请选择套餐"),
});

export const billingOrderNoParamSchema = z.object({
  orderNo: z.string().trim().min(1),
});

export type CreateBillingOrderBody = z.infer<typeof createBillingOrderBodySchema>;
