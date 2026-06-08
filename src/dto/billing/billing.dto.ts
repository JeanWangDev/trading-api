export function toMembershipPlanDto(plan: {
  planKey: string;
  name: string;
  description: string;
  priceUsdt: string;
  durationDays: number;
  targetRoleKey: string;
  chain: string;
  asset: string;
}) {
  return {
    planKey: plan.planKey,
    name: plan.name,
    description: plan.description,
    priceUsdt: plan.priceUsdt,
    durationDays: plan.durationDays,
    targetRoleKey: plan.targetRoleKey,
    chain: plan.chain,
    asset: plan.asset,
  };
}
