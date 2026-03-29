import { describe, it, expect } from "vitest";
import {
  calculateTokenEfficiency,
  calculateSpeedScore,
  calculateOutputQuality,
  calculateCompositeScore,
  getPerformanceMultiplier,
} from "../../src/lib/scoring";

describe("scoring", () => {
  describe("calculateTokenEfficiency", () => {
    it("returns 100 for very efficient token usage", () => {
      expect(calculateTokenEfficiency(200, 500)).toBe(100);
    });

    it("returns 75 for benchmark-level usage", () => {
      expect(calculateTokenEfficiency(500, 500)).toBe(75);
    });

    it("returns lower scores for overuse", () => {
      const score = calculateTokenEfficiency(750, 500);
      expect(score).toBeLessThan(75);
      expect(score).toBeGreaterThan(0);
    });

    it("handles zero benchmark gracefully", () => {
      expect(calculateTokenEfficiency(100, 0)).toBe(50);
    });
  });

  describe("calculateSpeedScore", () => {
    it("returns 100 for very fast completion", () => {
      expect(calculateSpeedScore(15, 60)).toBe(100);
    });

    it("returns 75 for on-time completion", () => {
      expect(calculateSpeedScore(60, 60)).toBe(75);
    });

    it("returns lower scores for slow completion", () => {
      const score = calculateSpeedScore(90, 60);
      expect(score).toBeLessThan(75);
    });
  });

  describe("calculateOutputQuality", () => {
    it("returns 100 for no revisions and no rating", () => {
      expect(calculateOutputQuality(0)).toBe(100);
    });

    it("deducts for revisions", () => {
      expect(calculateOutputQuality(1)).toBe(80);
      expect(calculateOutputQuality(2)).toBe(60);
    });

    it("incorporates client rating", () => {
      const withRating = calculateOutputQuality(0, 5);
      expect(withRating).toBe(100);

      const lowRating = calculateOutputQuality(0, 3);
      expect(lowRating).toBeLessThan(100);
    });
  });

  describe("calculateCompositeScore", () => {
    it("calculates a weighted composite", () => {
      const score = calculateCompositeScore({
        contractorId: "c1",
        taskId: "t1",
        tokensUsed: 400,
        benchmarkTokens: 500,
        timeTakenMinutes: 45,
        estimatedDurationMinutes: 60,
        revisionsRequired: 0,
        clientRating: 5,
      });

      expect(score.composite).toBeGreaterThan(0);
      expect(score.composite).toBeLessThanOrEqual(100);
      expect(score.contractorId).toBe("c1");
      expect(score.taskId).toBe("t1");
    });
  });

  describe("getPerformanceMultiplier", () => {
    it("returns 1.3x for 90+", () => {
      expect(getPerformanceMultiplier(95)).toBe(1.3);
    });

    it("returns 1.1x for 75-89", () => {
      expect(getPerformanceMultiplier(80)).toBe(1.1);
    });

    it("returns 1.0x for 60-74", () => {
      expect(getPerformanceMultiplier(65)).toBe(1.0);
    });

    it("returns 0.9x for below 60", () => {
      expect(getPerformanceMultiplier(50)).toBe(0.9);
    });
  });
});
