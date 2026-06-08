import { fetch } from "undici";
import { config } from "@/config";
import type { PaymentOrder } from "@/db";

export type PaymentCompletedPayload = {
  event: "payment.completed";
  orderNo: string;
  planKey: string;
  chain: string;
  asset: string;
  amountUsdt: string;
  depositAddress: string;
  txHash: string;
  paidAmountUsdt: string;
  paidAt: number;
  userId: number;
};

function buildPayload(order: PaymentOrder): PaymentCompletedPayload {
  return {
    event: "payment.completed",
    orderNo: order.orderNo,
    planKey: order.planKey,
    chain: order.chain,
    asset: order.asset,
    amountUsdt: String(order.amountUsdt),
    depositAddress: order.depositAddress,
    txHash: order.txHash ?? "",
    paidAmountUsdt: order.paidAmountUsdt ? String(order.paidAmountUsdt) : String(order.amountUsdt),
    paidAt: order.paidTime?.getTime() ?? Date.now(),
    userId: order.userId,
  };
}

/** 链上到账后通知外部系统（可选 webhook URL） */
export class BillingPaymentWebhookService {
  static async notifyPaymentCompleted(order: PaymentOrder): Promise<void> {
    const url = config.billing.paymentWebhookUrl.trim();
    if (!url) {
      console.log("[billing:webhook] skip (no BILLING_PAYMENT_WEBHOOK_URL)", order.orderNo);
      return;
    }

    const payload = buildPayload(order);
    const headers: Record<string, string> = {
      "content-type": "application/json",
    };

    const secret = config.billing.paymentWebhookSecret.trim();
    if (secret) {
      headers["x-billing-secret"] = secret;
    }

    try {
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const text = await response.text();
        console.error(
          `[billing:webhook] ${order.orderNo} HTTP ${response.status}: ${text.slice(0, 200)}`,
        );
        return;
      }

      console.log(`[billing:webhook] ${order.orderNo} delivered`);
    } catch (error) {
      console.error(`[billing:webhook] ${order.orderNo} failed`, error);
    }
  }
}
