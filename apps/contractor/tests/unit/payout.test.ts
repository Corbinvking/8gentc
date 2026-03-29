import { describe, it, expect } from "vitest";
import { calculatePayout, meetsPayoutThreshold, BASE_RATES } from "../../src/lib/payout";

describe("payout system", () => {
  describe("calculatePayout", () => {
    it("applies 1.3x multiplier for 90+ scores", () => {
      const result = calculatePayout({
        baseRate: 100,
        compositeScore: 95,
        tokensUsed: 500,
        benchmarkTokens: 500,
      });
      expect(result.performanceMultiplier).toBe(1.3);
      expect(result.total).toBe(130);
    });

    it("applies 1.1x multiplier for 75-89 scores", () => {
      const result = calculatePayout({
        baseRate: 100,
        compositeScore: 80,
        tokensUsed: 500,
        benchmarkTokens: 500,
      });
      expect(result.performanceMultiplier).toBe(1.1);
      expect(result.total).toBe(110);
    });

    it("applies 0.9x multiplier for below 60", () => {
      const result = calculatePayout({
        baseRate: 100,
        compositeScore: 50,
        tokensUsed: 500,
        benchmarkTokens: 500,
      });
      expect(result.performanceMultiplier).toBe(0.9);
      expect(result.total).toBe(90);
    });

    it("adds efficiency bonus for token-efficient work", () => {
      const result = calculatePayout({
        baseRate: 100,
        compositeScore: 75,
        tokensUsed: 300,
        benchmarkTokens: 500,
      });
      expect(result.efficiencyBonus).toBeGreaterThan(0);
      expect(result.total).toBeGreaterThan(110);
    });

    it("no efficiency bonus when tokens exceed 70% of benchmark", () => {
      const result = calculatePayout({
        baseRate: 100,
        compositeScore: 75,
        tokensUsed: 400,
        benchmarkTokens: 500,
      });
      expect(result.efficiencyBonus).toBe(0);
    });
  });

  describe("meetsPayoutThreshold", () => {
    it("returns true for amounts >= $25", () => {
      expect(meetsPayoutThreshold(25)).toBe(true);
      expect(meetsPayoutThreshold(100)).toBe(true);
    });

    it("returns false for amounts < $25", () => {
      expect(meetsPayoutThreshold(24.99)).toBe(false);
      expect(meetsPayoutThreshold(0)).toBe(false);
    });
  });

  describe("BASE_RATES", () => {
    it("has rates for all complexity levels", () => {
      expect(BASE_RATES[1]).toBe(10);
      expect(BASE_RATES[2]).toBe(25);
      expect(BASE_RATES[3]).toBe(50);
      expect(BASE_RATES[4]).toBe(100);
      expect(BASE_RATES[5]).toBe(200);
    });
  });
});
