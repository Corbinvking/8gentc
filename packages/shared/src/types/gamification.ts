export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  iconUrl?: string;
  criteria: Record<string, unknown>;
}

export type AchievementCategory =
  | "milestone"
  | "efficiency"
  | "speed"
  | "quality"
  | "streak"
  | "category_specific";

export interface ContractorAchievement {
  id: string;
  contractorId: string;
  achievementId: string;
  achievement?: Achievement;
  earnedAt: Date;
}

export interface LeaderboardEntry {
  id: string;
  contractorId: string;
  contractorName: string;
  tier: string;
  period: LeaderboardPeriod;
  category?: string;
  score: number;
  rank: number;
  tasksCompleted: number;
}

export type LeaderboardPeriod = "weekly" | "monthly" | "all_time";

export interface XPEvent {
  id: string;
  contractorId: string;
  taskId?: string;
  amount: number;
  reason: XPReason;
  createdAt: Date;
}

export type XPReason =
  | "task_completed"
  | "high_score_bonus"
  | "streak_bonus"
  | "badge_earned"
  | "tier_promotion";

export interface Streak {
  contractorId: string;
  currentLength: number;
  longestLength: number;
  lastTaskScore: number;
  lastTaskAt?: Date;
  isAtRisk: boolean;
}
