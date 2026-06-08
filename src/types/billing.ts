import type { BillingAsset, BillingChain, OrderStatus, SubscriptionStatus } from "@/constants/billing";

export interface MembershipPlanRecord {
  id: number;
  planKey: string;
  name: string;
  description: string;
  priceUsdt: string;
  durationDays: number;
  targetRoleKey: string;
  chain: BillingChain;
  asset: BillingAsset;
  sortOrder: number;
  status: number;
}

export interface PaymentOrderRecord {
  id: number;
  orderNo: string;
  userId: number;
  planId: number;
  planKey: string;
  chain: BillingChain;
  asset: BillingAsset;
  amountUsdt: string;
  depositAddress: string;
  addressIndex: number | null;
  status: OrderStatus;
  txHash: string | null;
  paidAmountUsdt: string | null;
  expireTime: Date;
  paidTime: Date | null;
  createdAt: Date;
}

export interface UserSubscriptionRecord {
  id: number;
  userId: number;
  planId: number;
  planKey: string;
  orderId: number | null;
  status: SubscriptionStatus;
  startsAt: Date;
  endsAt: Date;
}
