export interface PlanLimits {
  maxNotes: number;
  maxAgents: number;
  maxAgentRunsPerMonth: number;
  runtimeHoursPerMonth: number;
}

export const PLAN_LIMITS: Record<string, PlanLimits> = {
  free: {
    maxNotes: 50,
    maxAgents: 1,
    maxAgentRunsPerMonth: 100,
    runtimeHoursPerMonth: 1,
  },
  individual: {
    maxNotes: Infinity,
    maxAgents: 5,
    maxAgentRunsPerMonth: Infinity,
    runtimeHoursPerMonth: 10,
  },
  pro: {
    maxNotes: Infinity,
    maxAgents: 20,
    maxAgentRunsPerMonth: Infinity,
    runtimeHoursPerMonth: 50,
  },
  enterprise: {
    maxNotes: Infinity,
    maxAgents: Infinity,
    maxAgentRunsPerMonth: Infinity,
    runtimeHoursPerMonth: Infinity,
  },
};

export function getPlanLimits(plan: string): PlanLimits {
  return PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;
}

export function isWithinLimit(current: number, limit: number): boolean {
  return limit === Infinity || current < limit;
}
