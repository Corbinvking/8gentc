import type { PerformanceScore } from "@8gent/shared";

interface ScoringInput {
  contractorId: string;
  taskId: string;
  tokensUsed: number;
  benchmarkTokens: number;
  timeTakenMinutes: number;
  estimatedDurationMinutes: number;
  revisionsRequired: number;
  clientRating?: number;
}

const WEIGHTS = {
  tokenEfficiency: 0.25,
  promptQuality: 0.2,
  outputQuality: 0.35,
  speed: 0.2,
};

export function calculateTokenEfficiency(tokensUsed: number, benchmarkTokens: number): number {
  if (benchmarkTokens <= 0) return 50;
  const ratio = tokensUsed / benchmarkTokens;
  if (ratio <= 0.5) return 100;
  if (ratio <= 0.75) return 90;
  if (ratio <= 1.0) return 75;
  if (ratio <= 1.25) return 60;
  if (ratio <= 1.5) return 40;
  return Math.max(0, 20 - (ratio - 1.5) * 20);
}

export function calculateSpeedScore(timeTakenMinutes: number, estimatedDurationMinutes: number): number {
  if (estimatedDurationMinutes <= 0) return 50;
  const ratio = timeTakenMinutes / estimatedDurationMinutes;
  if (ratio <= 0.5) return 100;
  if (ratio <= 0.75) return 90;
  if (ratio <= 1.0) return 75;
  if (ratio <= 1.25) return 60;
  if (ratio <= 1.5) return 40;
  return Math.max(0, 20 - (ratio - 1.5) * 30);
}

export function calculateOutputQuality(revisionsRequired: number, clientRating?: number): number {
  let score = 100;

  score -= revisionsRequired * 20;

  if (clientRating !== undefined) {
    const ratingScore = (clientRating / 5) * 100;
    score = score * 0.5 + ratingScore * 0.5;
  }

  return Math.max(0, Math.min(100, score));
}

export function calculatePromptQuality(tokensUsed: number, outputQuality: number): number {
  const efficiencyComponent = Math.min(100, Math.max(0, 100 - (tokensUsed / 1000) * 10));
  return efficiencyComponent * 0.4 + outputQuality * 0.6;
}

export function calculateCompositeScore(input: ScoringInput): PerformanceScore {
  const tokenEfficiency = calculateTokenEfficiency(input.tokensUsed, input.benchmarkTokens);
  const speed = calculateSpeedScore(input.timeTakenMinutes, input.estimatedDurationMinutes);
  const outputQuality = calculateOutputQuality(input.revisionsRequired, input.clientRating);
  const promptQuality = calculatePromptQuality(input.tokensUsed, outputQuality);

  const composite =
    tokenEfficiency * WEIGHTS.tokenEfficiency +
    promptQuality * WEIGHTS.promptQuality +
    outputQuality * WEIGHTS.outputQuality +
    speed * WEIGHTS.speed;

  return {
    contractorId: input.contractorId,
    taskId: input.taskId,
    tokenEfficiency: Math.round(tokenEfficiency * 100) / 100,
    promptQuality: Math.round(promptQuality * 100) / 100,
    outputQuality: Math.round(outputQuality * 100) / 100,
    speed: Math.round(speed * 100) / 100,
    composite: Math.round(composite * 100) / 100,
    calculatedAt: new Date(),
  };
}

export function getPerformanceMultiplier(compositeScore: number): number {
  if (compositeScore >= 90) return 1.3;
  if (compositeScore >= 75) return 1.1;
  if (compositeScore >= 60) return 1.0;
  return 0.9;
}
