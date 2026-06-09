export const STRATEGY_VISIBILITY_DRAFT = 0;
export const STRATEGY_VISIBILITY_PUBLIC = 1;

export const PLATFORM_STRATEGY_USER_ID = 0;

export type StrategyVisibility = "draft" | "public";

export function strategyVisibilityToDb(value: StrategyVisibility): number {
  return value === "public" ? STRATEGY_VISIBILITY_PUBLIC : STRATEGY_VISIBILITY_DRAFT;
}

export function strategyVisibilityFromDb(value: number): StrategyVisibility {
  return value === STRATEGY_VISIBILITY_PUBLIC ? "public" : "draft";
}

export function buildStrategyPlanKey(strategyKey: string): string {
  const key = `strategy_${strategyKey}`;
  if (key.length > 32) {
    throw new Error(`plan key too long: ${key}`);
  }
  return key;
}
