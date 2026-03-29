import type { ContractorTier } from "@8gent/shared";

interface TierConfig {
  tier: ContractorTier;
  label: string;
  minComposite: number;
  consecutiveTasksRequired: number;
  xpThreshold: number;
  schedulingAdvanceDays: number;
  payoutMultiplierBonus: number;
}

export const TIER_CONFIG: Record<ContractorTier, TierConfig> = {
  new: {
    tier: "new",
    label: "Tier 1 — New",
    minComposite: 0,
    consecutiveTasksRequired: 0,
    xpThreshold: 0,
    schedulingAdvanceDays: 3,
    payoutMultiplierBonus: 0,
  },
  established: {
    tier: "established",
    label: "Tier 2 — Established",
    minComposite: 60,
    consecutiveTasksRequired: 10,
    xpThreshold: 500,
    schedulingAdvanceDays: 5,
    payoutMultiplierBonus: 0,
  },
  expert: {
    tier: "expert",
    label: "Tier 3 — Expert",
    minComposite: 75,
    consecutiveTasksRequired: 20,
    xpThreshold: 2000,
    schedulingAdvanceDays: 7,
    payoutMultiplierBonus: 0.05,
  },
  elite: {
    tier: "elite",
    label: "Tier 4 — Elite",
    minComposite: 90,
    consecutiveTasksRequired: 30,
    xpThreshold: 5000,
    schedulingAdvanceDays: 7,
    payoutMultiplierBonus: 0.1,
  },
};

const TIER_ORDER: ContractorTier[] = ["new", "established", "expert", "elite"];
const GRACE_PERIOD_TASKS = 5;

export function evaluateTierChange(
  currentTier: ContractorTier,
  recentScores: number[],
  totalXp: number
): { newTier: ContractorTier; changed: boolean; direction: "promotion" | "demotion" | "none" } {
  const currentIndex = TIER_ORDER.indexOf(currentTier);

  // Check promotion
  if (currentIndex < TIER_ORDER.length - 1) {
    const nextTier = TIER_ORDER[currentIndex + 1];
    const nextConfig = TIER_CONFIG[nextTier];

    if (
      totalXp >= nextConfig.xpThreshold &&
      recentScores.length >= nextConfig.consecutiveTasksRequired
    ) {
      const relevantScores = recentScores.slice(-nextConfig.consecutiveTasksRequired);
      const allAboveThreshold = relevantScores.every((s) => s >= nextConfig.minComposite);

      if (allAboveThreshold) {
        return { newTier: nextTier, changed: true, direction: "promotion" };
      }
    }
  }

  // Check demotion (with grace period)
  if (currentIndex > 0) {
    const currentConfig = TIER_CONFIG[currentTier];
    const prevTier = TIER_ORDER[currentIndex - 1];

    if (recentScores.length > GRACE_PERIOD_TASKS) {
      const recentRelevant = recentScores.slice(-GRACE_PERIOD_TASKS);
      const avgScore = recentRelevant.reduce((a, b) => a + b, 0) / recentRelevant.length;

      if (avgScore < currentConfig.minComposite) {
        return { newTier: prevTier, changed: true, direction: "demotion" };
      }
    }
  }

  return { newTier: currentTier, changed: false, direction: "none" };
}

export function getXpForTask(compositeScore: number, tier: ContractorTier): number {
  const baseXp = 50;
  const tierMultiplier = TIER_ORDER.indexOf(tier) + 1;
  const scoreBonus = compositeScore >= 90 ? 50 : compositeScore >= 75 ? 25 : compositeScore >= 60 ? 10 : 0;

  return Math.max(0, baseXp * tierMultiplier + scoreBonus);
}

export function getStreakBonus(streakLength: number): number {
  if (streakLength >= 20) return 100;
  if (streakLength >= 10) return 50;
  if (streakLength >= 5) return 25;
  return 0;
}
