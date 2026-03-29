import { getPerformanceMultiplier } from "./scoring";

interface PayoutCalculationInput {
  baseRate: number;
  compositeScore: number;
  tokensUsed: number;
  benchmarkTokens: number;
}

export interface PayoutCalculation {
  baseRate: number;
  performanceMultiplier: number;
  efficiencyBonus: number;
  total: number;
}

const MINIMUM_PAYOUT_THRESHOLD = 25;
const EFFICIENCY_BONUS_RATE = 0.1;

export function calculatePayout(input: PayoutCalculationInput): PayoutCalculation {
  const performanceMultiplier = getPerformanceMultiplier(input.compositeScore);

  let efficiencyBonus = 0;
  if (input.benchmarkTokens > 0 && input.tokensUsed < input.benchmarkTokens * 0.7) {
    const savings = (input.benchmarkTokens - input.tokensUsed) / input.benchmarkTokens;
    efficiencyBonus = input.baseRate * savings * EFFICIENCY_BONUS_RATE;
  }

  const total = input.baseRate * performanceMultiplier + efficiencyBonus;

  return {
    baseRate: Math.round(input.baseRate * 100) / 100,
    performanceMultiplier,
    efficiencyBonus: Math.round(efficiencyBonus * 100) / 100,
    total: Math.round(total * 100) / 100,
  };
}

export function meetsPayoutThreshold(amount: number): boolean {
  return amount >= MINIMUM_PAYOUT_THRESHOLD;
}

export const BASE_RATES: Record<number, number> = {
  1: 10,
  2: 25,
  3: 50,
  4: 100,
  5: 200,
};
