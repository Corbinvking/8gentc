import { describe, it, expect } from "vitest";
import { evaluateTierChange, getXpForTask, getStreakBonus } from "../../src/lib/tier";

describe("tier system", () => {
  describe("evaluateTierChange", () => {
    it("promotes from new to established with sufficient scores", () => {
      const scores = Array(10).fill(65);
      const result = evaluateTierChange("new", scores, 500);
      expect(result.changed).toBe(true);
      expect(result.newTier).toBe("established");
      expect(result.direction).toBe("promotion");
    });

    it("does not promote without enough tasks", () => {
      const scores = Array(5).fill(65);
      const result = evaluateTierChange("new", scores, 500);
      expect(result.changed).toBe(false);
    });

    it("does not promote without enough XP", () => {
      const scores = Array(10).fill(65);
      const result = evaluateTierChange("new", scores, 100);
      expect(result.changed).toBe(false);
    });

    it("demotes when scores drop below threshold", () => {
      const scores = Array(10).fill(40);
      const result = evaluateTierChange("established", scores, 1000);
      expect(result.changed).toBe(true);
      expect(result.newTier).toBe("new");
      expect(result.direction).toBe("demotion");
    });

    it("respects grace period for demotion", () => {
      const scores = Array(3).fill(40);
      const result = evaluateTierChange("established", scores, 1000);
      expect(result.changed).toBe(false);
    });

    it("does not demote from new tier", () => {
      const scores = Array(10).fill(20);
      const result = evaluateTierChange("new", scores, 0);
      expect(result.changed).toBe(false);
    });
  });

  describe("demotion grace period verification", () => {
    it("cannot demote contractor with fewer than 5 completed tasks after promotion", () => {
      const scores = Array(4).fill(30);
      const result = evaluateTierChange("established", scores, 1000);
      expect(result.changed).toBe(false);
      expect(result.direction).toBe("none");
    });

    it("cannot demote with exactly 5 tasks (needs > 5)", () => {
      const scores = Array(5).fill(30);
      const result = evaluateTierChange("established", scores, 1000);
      expect(result.changed).toBe(false);
    });

    it("demotes contractor with 6+ low-scoring tasks", () => {
      const scores = Array(6).fill(30);
      const result = evaluateTierChange("established", scores, 1000);
      expect(result.changed).toBe(true);
      expect(result.newTier).toBe("new");
      expect(result.direction).toBe("demotion");
    });

    it("does not demote when last 5 scores average at or above threshold", () => {
      const scores = [...Array(6).fill(80), ...Array(5).fill(61)];
      const result = evaluateTierChange("established", scores, 1000);
      expect(result.changed).toBe(false);
    });

    it("demotes expert to established when last 5 average below 75", () => {
      const scores = Array(10).fill(50);
      const result = evaluateTierChange("expert", scores, 3000);
      expect(result.changed).toBe(true);
      expect(result.newTier).toBe("established");
    });
  });

  describe("getXpForTask", () => {
    it("gives base XP for low scores", () => {
      const xp = getXpForTask(50, "new");
      expect(xp).toBe(50);
    });

    it("gives bonus XP for high scores", () => {
      const xp = getXpForTask(95, "new");
      expect(xp).toBe(100);
    });

    it("never returns negative XP (floor guard)", () => {
      const xp = getXpForTask(-100, "new");
      expect(xp).toBeGreaterThanOrEqual(0);
    });

    it("multiplies by tier level", () => {
      const newXp = getXpForTask(70, "new");
      const expertXp = getXpForTask(70, "expert");
      expect(expertXp).toBeGreaterThan(newXp);
    });
  });

  describe("getStreakBonus", () => {
    it("returns 0 for short streaks", () => {
      expect(getStreakBonus(3)).toBe(0);
    });

    it("returns 25 for 5+ streaks", () => {
      expect(getStreakBonus(5)).toBe(25);
    });

    it("returns 50 for 10+ streaks", () => {
      expect(getStreakBonus(10)).toBe(50);
    });

    it("returns 100 for 20+ streaks", () => {
      expect(getStreakBonus(20)).toBe(100);
    });
  });
});
