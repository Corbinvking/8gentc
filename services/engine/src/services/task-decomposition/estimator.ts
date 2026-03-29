import type { WorkstreamDomain } from "@8gent/shared";

interface Estimate {
  tokens: number;
  durationMinutes: number;
  complexityTier: number;
}

const DOMAIN_BASE_ESTIMATES: Record<WorkstreamDomain, Estimate> = {
  development: { tokens: 50_000, durationMinutes: 480, complexityTier: 3 },
  content: { tokens: 20_000, durationMinutes: 240, complexityTier: 2 },
  research: { tokens: 30_000, durationMinutes: 360, complexityTier: 3 },
  consulting: { tokens: 25_000, durationMinutes: 300, complexityTier: 3 },
  design: { tokens: 15_000, durationMinutes: 180, complexityTier: 2 },
  mixed: { tokens: 30_000, durationMinutes: 360, complexityTier: 3 },
};

const COMPLEXITY_MULTIPLIERS = [0.5, 0.75, 1.0, 1.5, 2.0];

export function estimateWorkstream(
  domain: WorkstreamDomain,
  description: string,
  complexityTier: number
): Estimate {
  const base = DOMAIN_BASE_ESTIMATES[domain] ?? DOMAIN_BASE_ESTIMATES.mixed;
  const multiplier = COMPLEXITY_MULTIPLIERS[complexityTier - 1] ?? 1.0;

  const descriptionLengthFactor = Math.min(description.length / 500, 2.0);
  const adjustedMultiplier = multiplier * (0.8 + descriptionLengthFactor * 0.2);

  return {
    tokens: Math.round(base.tokens * adjustedMultiplier),
    durationMinutes: Math.round(base.durationMinutes * adjustedMultiplier),
    complexityTier: Math.min(Math.max(complexityTier, 1), 5),
  };
}
