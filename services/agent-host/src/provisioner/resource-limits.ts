import type { UserPlan } from "@8gent/shared";

export interface ResourceLimits {
  maxAgents: number;
  memoryPerAgentMb: number;
  cpuSharesPerAgent: number;
  maxTotalMemoryMb: number;
}

const PLAN_LIMITS: Record<UserPlan, ResourceLimits> = {
  free: {
    maxAgents: 2,
    memoryPerAgentMb: 256,
    cpuSharesPerAgent: 256,
    maxTotalMemoryMb: 512,
  },
  pro: {
    maxAgents: 10,
    memoryPerAgentMb: 512,
    cpuSharesPerAgent: 512,
    maxTotalMemoryMb: 4096,
  },
  enterprise: {
    maxAgents: 50,
    memoryPerAgentMb: 1024,
    cpuSharesPerAgent: 1024,
    maxTotalMemoryMb: 32768,
  },
};

export function getLimitsForPlan(plan: UserPlan): ResourceLimits {
  return PLAN_LIMITS[plan]!;
}

export function canSpawnAgent(
  plan: UserPlan,
  currentAgentCount: number
): boolean {
  const limits = PLAN_LIMITS[plan]!;
  return currentAgentCount < limits.maxAgents;
}

export const CONTRACTOR_WORKSPACE_LIMITS: ResourceLimits = {
  maxAgents: 1,
  memoryPerAgentMb: 2048,
  cpuSharesPerAgent: 1024,
  maxTotalMemoryMb: 2048,
};
