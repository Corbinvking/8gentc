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
