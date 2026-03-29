export interface Contractor {
  id: string;
  userId: string;
  displayName: string;
  skills: string[];
  rating: number;
  completedTasks: number;
  status: ContractorStatus;
  tier: ContractorTier;
  bio?: string;
  timezone?: string;
  location?: string;
  availabilityPreference?: AvailabilityPreference;
  onboardingStatus: OnboardingStatus;
  assessmentScore?: number;
  compositeScore?: number;
  xp: number;
  currentStreak: number;
  stripeConnectId?: string;
  contractorAgreementSignedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type ContractorStatus = "pending" | "active" | "suspended" | "inactive";

export type ContractorTier = "new" | "established" | "expert" | "elite";

export type OnboardingStatus =
  | "submitted"
  | "under_review"
  | "assessment"
  | "approved"
  | "rejected";

export type AvailabilityPreference = "full_time" | "part_time" | "flexible";

export type ContractorSkillCategory =
  | "development"
  | "content_creation"
  | "research"
  | "consulting"
  | "management"
  | "customer_service";

export interface ContractorProfile {
  id: string;
  contractorId: string;
  bio: string;
  timezone: string;
  location: string;
  availabilityPreference: AvailabilityPreference;
  portfolioLinks: string[];
  experienceLevels: SkillExperience[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SkillExperience {
  category: ContractorSkillCategory;
  level: ExperienceLevel;
  yearsOfExperience?: number;
}

export type ExperienceLevel = "beginner" | "intermediate" | "advanced" | "expert";

export interface ContractorAssessment {
  id: string;
  contractorId: string;
  taskType: ContractorSkillCategory;
  prompt: string;
  response: string;
  tokenEfficiencyScore: number;
  outputQualityScore: number;
  speedScore: number;
  compositeScore: number;
  timeLimit: number;
  timeTaken: number;
  startedAt: Date;
  completedAt?: Date;
}
