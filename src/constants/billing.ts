export const BILLING_CHAINS = ["TRC20"] as const;
export type BillingChain = (typeof BILLING_CHAINS)[number];

export const BILLING_ASSETS = ["USDT"] as const;
export type BillingAsset = (typeof BILLING_ASSETS)[number];

export const ORDER_STATUSES = ["pending", "paid", "expired", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const SUBSCRIPTION_STATUSES = ["active", "expired"] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const VIP_ROLE_KEY = "vip_user";
export const NORMAL_ROLE_KEY = "normal_user";

/** Tron mainnet USDT TRC20 */
export const DEFAULT_TRON_USDT_CONTRACT = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
