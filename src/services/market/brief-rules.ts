/** 盘面助手规则阈值（可调，无需改业务逻辑） */
export const BRIEF_RULES = {
  nearLevelPct: 1.5,
  fundingHigh: 0.0003,
  fundingLow: -0.00005,
  fearGreedFear: 35,
  fearGreedGreed: 65,
  bullishMinScore: 3,
  bearishMinScore: 3,
  maxOppositeScore: 1,
  stopBelowSupportPct: 0.8,
  trendMaFast: 20,
  trendMaSlow: 60,
  klineLookback: 80,
} as const;
