import { describe, it, expect } from "vitest";
import { checkNewBadges, BADGE_DEFINITIONS } from "../../src/lib/gamification";

describe("gamification", () => {
  describe("checkNewBadges", () => {
    it("awards first_task badge", () => {
      const badges = checkNewBadges(
        {
          completedTasks: 1,
          currentStreak: 1,
          longestStreak: 1,
          compositeScore: 70,
          tokenEfficiencyAvg: 70,
          speedAvg: 70,
          tier: "new",
          totalXp: 50,
          tasksByCategory: { development: 1 },
        },
        []
      );

      expect(badges.some((b) => b.id === "first_task")).toBe(true);
    });

    it("does not re-award earned badges", () => {
      const badges = checkNewBadges(
        {
          completedTasks: 1,
          currentStreak: 1,
          longestStreak: 1,
          compositeScore: 70,
          tokenEfficiencyAvg: 70,
          speedAvg: 70,
          tier: "new",
          totalXp: 50,
          tasksByCategory: {},
        },
        ["first_task"]
      );

      expect(badges.some((b) => b.id === "first_task")).toBe(false);
    });

    it("awards token_master for high efficiency", () => {
      const badges = checkNewBadges(
        {
          completedTasks: 50,
          currentStreak: 10,
          longestStreak: 15,
          compositeScore: 85,
          tokenEfficiencyAvg: 92,
          speedAvg: 80,
          tier: "expert",
          totalXp: 3000,
          tasksByCategory: { development: 30 },
        },
        []
      );

      expect(badges.some((b) => b.id === "token_master")).toBe(true);
    });
  });

  describe("idempotency — calling twice returns empty on second call", () => {
    it("returns empty when all qualifying badges already earned", () => {
      const stats = {
        completedTasks: 1,
        currentStreak: 1,
        longestStreak: 1,
        compositeScore: 70,
        tokenEfficiencyAvg: 70,
        speedAvg: 70,
        tier: "new" as const,
        totalXp: 50,
        tasksByCategory: { development: 1 },
      };

      const firstCall = checkNewBadges(stats, []);
      const earnedIds = firstCall.map((b) => b.id);
      const secondCall = checkNewBadges(stats, earnedIds);
      expect(secondCall).toHaveLength(0);
    });
  });

  describe("exact threshold edge cases", () => {
    it("awards first_task at exactly 1 completed task", () => {
      const badges = checkNewBadges({
        completedTasks: 1, currentStreak: 0, longestStreak: 0,
        compositeScore: 0, tokenEfficiencyAvg: 0, speedAvg: 0,
        tier: "new", totalXp: 0, tasksByCategory: {},
      }, []);
      expect(badges.some((b) => b.id === "first_task")).toBe(true);
    });

    it("does not award first_task at 0 completed tasks", () => {
      const badges = checkNewBadges({
        completedTasks: 0, currentStreak: 0, longestStreak: 0,
        compositeScore: 0, tokenEfficiencyAvg: 0, speedAvg: 0,
        tier: "new", totalXp: 0, tasksByCategory: {},
      }, []);
      expect(badges.some((b) => b.id === "first_task")).toBe(false);
    });

    it("awards ten_streak at exactly 10", () => {
      const badges = checkNewBadges({
        completedTasks: 10, currentStreak: 10, longestStreak: 10,
        compositeScore: 70, tokenEfficiencyAvg: 70, speedAvg: 70,
        tier: "new", totalXp: 500, tasksByCategory: {},
      }, []);
      expect(badges.some((b) => b.id === "ten_streak")).toBe(true);
    });

    it("does not award ten_streak at 9", () => {
      const badges = checkNewBadges({
        completedTasks: 9, currentStreak: 9, longestStreak: 9,
        compositeScore: 70, tokenEfficiencyAvg: 70, speedAvg: 70,
        tier: "new", totalXp: 400, tasksByCategory: {},
      }, []);
      expect(badges.some((b) => b.id === "ten_streak")).toBe(false);
    });

    it("awards token_master at exactly 90 efficiency", () => {
      const badges = checkNewBadges({
        completedTasks: 10, currentStreak: 5, longestStreak: 5,
        compositeScore: 70, tokenEfficiencyAvg: 90, speedAvg: 70,
        tier: "new", totalXp: 500, tasksByCategory: {},
      }, []);
      expect(badges.some((b) => b.id === "token_master")).toBe(true);
    });

    it("awards speed_demon at exactly 85 speed", () => {
      const badges = checkNewBadges({
        completedTasks: 10, currentStreak: 5, longestStreak: 5,
        compositeScore: 70, tokenEfficiencyAvg: 70, speedAvg: 85,
        tier: "new", totalXp: 500, tasksByCategory: {},
      }, []);
      expect(badges.some((b) => b.id === "speed_demon")).toBe(true);
    });

    it("awards fifty_tasks at exactly 50", () => {
      const badges = checkNewBadges({
        completedTasks: 50, currentStreak: 0, longestStreak: 0,
        compositeScore: 70, tokenEfficiencyAvg: 70, speedAvg: 70,
        tier: "new", totalXp: 2500, tasksByCategory: {},
      }, []);
      expect(badges.some((b) => b.id === "fifty_tasks")).toBe(true);
    });

    it("awards century at exactly 100", () => {
      const badges = checkNewBadges({
        completedTasks: 100, currentStreak: 0, longestStreak: 0,
        compositeScore: 70, tokenEfficiencyAvg: 70, speedAvg: 70,
        tier: "new", totalXp: 5000, tasksByCategory: {},
      }, []);
      expect(badges.some((b) => b.id === "century")).toBe(true);
    });

    it("awards perfect_score at exactly 95", () => {
      const badges = checkNewBadges({
        completedTasks: 1, currentStreak: 1, longestStreak: 1,
        compositeScore: 95, tokenEfficiencyAvg: 90, speedAvg: 90,
        tier: "expert", totalXp: 2000, tasksByCategory: {},
      }, []);
      expect(badges.some((b) => b.id === "perfect_score")).toBe(true);
    });

    it("does not award perfect_score at 94", () => {
      const badges = checkNewBadges({
        completedTasks: 1, currentStreak: 1, longestStreak: 1,
        compositeScore: 94, tokenEfficiencyAvg: 90, speedAvg: 90,
        tier: "expert", totalXp: 2000, tasksByCategory: {},
      }, []);
      expect(badges.some((b) => b.id === "perfect_score")).toBe(false);
    });

    it("awards tier_expert for expert tier", () => {
      const badges = checkNewBadges({
        completedTasks: 20, currentStreak: 5, longestStreak: 10,
        compositeScore: 80, tokenEfficiencyAvg: 80, speedAvg: 80,
        tier: "expert", totalXp: 2000, tasksByCategory: {},
      }, []);
      expect(badges.some((b) => b.id === "tier_expert")).toBe(true);
    });

    it("awards tier_elite for elite tier", () => {
      const badges = checkNewBadges({
        completedTasks: 30, currentStreak: 10, longestStreak: 20,
        compositeScore: 92, tokenEfficiencyAvg: 90, speedAvg: 90,
        tier: "elite", totalXp: 5000, tasksByCategory: {},
      }, []);
      expect(badges.some((b) => b.id === "tier_elite")).toBe(true);
    });

    it("awards code_wizard with 25 dev tasks and score >= 80", () => {
      const badges = checkNewBadges({
        completedTasks: 25, currentStreak: 5, longestStreak: 10,
        compositeScore: 80, tokenEfficiencyAvg: 80, speedAvg: 80,
        tier: "established", totalXp: 1500,
        tasksByCategory: { development: 25 },
      }, []);
      expect(badges.some((b) => b.id === "code_wizard")).toBe(true);
    });
  });

  describe("BADGE_DEFINITIONS", () => {
    it("has at least 10 badge definitions", () => {
      expect(BADGE_DEFINITIONS.length).toBeGreaterThanOrEqual(10);
    });

    it("all badges have required fields", () => {
      for (const badge of BADGE_DEFINITIONS) {
        expect(badge.id).toBeTruthy();
        expect(badge.name).toBeTruthy();
        expect(badge.description).toBeTruthy();
        expect(badge.category).toBeTruthy();
        expect(typeof badge.criteria).toBe("function");
      }
    });
  });
});
