import type { ContractorTier } from "@8gent/shared";

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  criteria: (stats: ContractorStats) => boolean;
}

interface ContractorStats {
  completedTasks: number;
  currentStreak: number;
  longestStreak: number;
  compositeScore: number;
  tokenEfficiencyAvg: number;
  speedAvg: number;
  tier: ContractorTier;
  totalXp: number;
  tasksByCategory: Record<string, number>;
}

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    id: "first_task",
    name: "First Task Completed",
    description: "Complete your first task on the platform",
    category: "milestone",
    criteria: (s) => s.completedTasks >= 1,
  },
  {
    id: "ten_streak",
    name: "10 Tasks Streak",
    description: "Complete 10 tasks in a row without any rejections",
    category: "streak",
    criteria: (s) => s.longestStreak >= 10,
  },
  {
    id: "token_master",
    name: "Token Master",
    description: "Maintain top 10% token efficiency across all tasks",
    category: "efficiency",
    criteria: (s) => s.tokenEfficiencyAvg >= 90,
  },
  {
    id: "speed_demon",
    name: "Speed Demon",
    description: "Consistently deliver tasks ahead of estimated time",
    category: "speed",
    criteria: (s) => s.speedAvg >= 85,
  },
  {
    id: "code_wizard",
    name: "Code Wizard",
    description: "Complete 25 coding tasks with a composite score above 80",
    category: "category_specific",
    criteria: (s) => (s.tasksByCategory.development ?? 0) >= 25 && s.compositeScore >= 80,
  },
  {
    id: "content_creator",
    name: "Content Creator",
    description: "Complete 25 content tasks with a composite score above 80",
    category: "category_specific",
    criteria: (s) => (s.tasksByCategory.content_creation ?? 0) >= 25 && s.compositeScore >= 80,
  },
  {
    id: "research_ace",
    name: "Research Ace",
    description: "Complete 25 research tasks with a composite score above 80",
    category: "category_specific",
    criteria: (s) => (s.tasksByCategory.research ?? 0) >= 25 && s.compositeScore >= 80,
  },
  {
    id: "fifty_tasks",
    name: "Half Century",
    description: "Complete 50 tasks on the platform",
    category: "milestone",
    criteria: (s) => s.completedTasks >= 50,
  },
  {
    id: "century",
    name: "Century",
    description: "Complete 100 tasks on the platform",
    category: "milestone",
    criteria: (s) => s.completedTasks >= 100,
  },
  {
    id: "tier_expert",
    name: "Expert Tier",
    description: "Reach Tier 3 — Expert status",
    category: "milestone",
    criteria: (s) => s.tier === "expert" || s.tier === "elite",
  },
  {
    id: "tier_elite",
    name: "Elite Tier",
    description: "Reach Tier 4 — Elite status",
    category: "milestone",
    criteria: (s) => s.tier === "elite",
  },
  {
    id: "perfect_score",
    name: "Perfectionist",
    description: "Achieve a composite score of 95 or above on any task",
    category: "quality",
    criteria: (s) => s.compositeScore >= 95,
  },
];

export function checkNewBadges(stats: ContractorStats, earnedBadgeIds: string[]): BadgeDefinition[] {
  return BADGE_DEFINITIONS.filter(
    (badge) => !earnedBadgeIds.includes(badge.id) && badge.criteria(stats)
  );
}
