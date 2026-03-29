import { db } from "../../../lib/db.js";
import { telemetryEvents, contractors } from "@8gent/db";
import { eq, and, gte, sql } from "drizzle-orm";

export interface ContractorScore {
  contractorId: string;
  qualityScore: number;
  speedScore: number;
  efficiencyScore: number;
  reliabilityScore: number;
  composite: number;
  tasksScoredFrom: number;
}

export async function computeContractorScore(
  contractorId: string,
  since: Date
): Promise<ContractorScore> {
  const events = await db
    .select()
    .from(telemetryEvents)
    .where(
      and(
        eq(telemetryEvents.contractorId, contractorId),
        gte(telemetryEvents.timestamp, since)
      )
    );

  const completed = events.filter((e) => e.type === "task.completed");
  const failed = events.filter((e) => e.type === "task.failed");
  const llmCalls = events.filter((e) => e.type === "llm.call");

  const totalTasks = completed.length + failed.length;

  const reliabilityScore = totalTasks > 0 ? (completed.length / totalTasks) * 100 : 50;
  const qualityScore = calculateQualityScore(completed);
  const speedScore = calculateSpeedScore(completed);
  const efficiencyScore = calculateEfficiencyScore(llmCalls, completed.length);

  const composite =
    qualityScore * 0.35 +
    speedScore * 0.20 +
    efficiencyScore * 0.20 +
    reliabilityScore * 0.25;

  return {
    contractorId,
    qualityScore,
    speedScore,
    efficiencyScore,
    reliabilityScore,
    composite,
    tasksScoredFrom: totalTasks,
  };
}

function calculateQualityScore(
  completed: Array<{ payload: Record<string, unknown> | null }>
): number {
  if (completed.length === 0) return 50;

  let totalRating = 0;
  let ratedCount = 0;

  for (const event of completed) {
    const rating = (event.payload as Record<string, unknown>)?.rating;
    if (typeof rating === "number") {
      totalRating += rating;
      ratedCount++;
    }
  }

  if (ratedCount === 0) return 50;
  return (totalRating / ratedCount) * 20;
}

function calculateSpeedScore(
  completed: Array<{ payload: Record<string, unknown> | null }>
): number {
  if (completed.length === 0) return 50;

  let totalOnTime = 0;
  for (const event of completed) {
    const onTime = (event.payload as Record<string, unknown>)?.onTime;
    if (onTime) totalOnTime++;
  }

  return (totalOnTime / completed.length) * 100;
}

function calculateEfficiencyScore(
  llmCalls: Array<{ payload: Record<string, unknown> | null }>,
  taskCount: number
): number {
  if (taskCount === 0) return 50;

  const totalTokens = llmCalls.reduce((sum, e) => {
    const tokens = (e.payload as Record<string, unknown>)?.totalTokens;
    return sum + (typeof tokens === "number" ? tokens : 0);
  }, 0);

  const avgTokensPerTask = totalTokens / taskCount;
  if (avgTokensPerTask < 10_000) return 100;
  if (avgTokensPerTask < 50_000) return 75;
  if (avgTokensPerTask < 100_000) return 50;
  return 25;
}
