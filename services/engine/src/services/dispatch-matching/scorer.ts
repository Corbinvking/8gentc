import type { Contractor, Workstream } from "@8gent/shared";

export interface MatchScore {
  contractorId: string;
  workstreamId: string;
  skillMatch: number;
  tierMatch: number;
  performanceHistory: number;
  availabilityFit: number;
  currentWorkload: number;
  tokenEfficiency: number;
  composite: number;
}

interface ScoringWeights {
  skillMatch: number;
  tierMatch: number;
  performanceHistory: number;
  availabilityFit: number;
  currentWorkload: number;
  tokenEfficiency: number;
}

const DEFAULT_WEIGHTS: ScoringWeights = {
  skillMatch: 0.30,
  tierMatch: 0.15,
  performanceHistory: 0.20,
  availabilityFit: 0.10,
  currentWorkload: 0.15,
  tokenEfficiency: 0.10,
};

export interface ContractorProfile extends Contractor {
  activeTasks: number;
  maxConcurrentTasks: number;
  compositeScore: number;
  tokenEfficiencyScore: number;
  availableHoursPerWeek: number;
}

export function scoreMatch(
  workstream: Workstream,
  contractor: ContractorProfile,
  weights: ScoringWeights = DEFAULT_WEIGHTS
): MatchScore {
  const skillMatch = calculateSkillMatch(workstream.domain, contractor.skills);
  const tierMatch = calculateTierMatch(workstream.complexityTier, contractor);
  const performanceHistory = Math.min(contractor.compositeScore, 100);
  const availabilityFit = calculateAvailability(
    workstream.estimatedDurationMinutes ?? 480,
    contractor.availableHoursPerWeek
  );
  const currentWorkload = calculateWorkloadScore(
    contractor.activeTasks,
    contractor.maxConcurrentTasks
  );
  const tokenEfficiency = contractor.tokenEfficiencyScore;

  const composite =
    skillMatch * weights.skillMatch +
    tierMatch * weights.tierMatch +
    performanceHistory * weights.performanceHistory +
    availabilityFit * weights.availabilityFit +
    currentWorkload * weights.currentWorkload +
    tokenEfficiency * weights.tokenEfficiency;

  return {
    contractorId: contractor.id,
    workstreamId: workstream.id,
    skillMatch,
    tierMatch,
    performanceHistory,
    availabilityFit,
    currentWorkload,
    tokenEfficiency,
    composite,
  };
}

function calculateSkillMatch(domain: string, contractorSkills: string[]): number {
  const domainSkills: Record<string, string[]> = {
    development: ["javascript", "typescript", "python", "react", "node", "coding"],
    content: ["writing", "editing", "copywriting", "seo", "marketing"],
    research: ["analysis", "data", "research", "reporting", "statistics"],
    consulting: ["strategy", "analysis", "business", "management", "advisory"],
    design: ["ui", "ux", "figma", "design", "visual"],
    mixed: [],
  };

  const required = domainSkills[domain] ?? [];
  if (required.length === 0) return 50;

  const lowerSkills = contractorSkills.map((s) => s.toLowerCase());
  const matches = required.filter((r) =>
    lowerSkills.some((s) => s.includes(r))
  ).length;

  return Math.round((matches / required.length) * 100);
}

function calculateTierMatch(complexityTier: number, contractor: ContractorProfile): number {
  const ratingTier = Math.ceil(contractor.rating * 5);
  const diff = Math.abs(complexityTier - ratingTier);
  return Math.max(0, 100 - diff * 25);
}

function calculateAvailability(
  estimatedMinutes: number,
  availableHoursPerWeek: number
): number {
  const estimatedHours = estimatedMinutes / 60;
  if (availableHoursPerWeek <= 0) return 0;
  const ratio = availableHoursPerWeek / estimatedHours;
  return Math.min(100, Math.round(ratio * 50));
}

function calculateWorkloadScore(activeTasks: number, maxTasks: number): number {
  if (maxTasks <= 0) return 0;
  const utilization = activeTasks / maxTasks;
  return Math.round((1 - utilization) * 100);
}
