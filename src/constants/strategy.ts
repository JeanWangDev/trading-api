export const DEFAULT_PLATFORM_FEE_RATE = 20;

export function isStrategyPlanKey(planKey: string): boolean {
  return planKey.startsWith("strategy_");
}

export const STRATEGY_KEY_PATTERN = /^[a-z0-9_]{3,20}$/;
