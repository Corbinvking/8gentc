import { db } from "../lib/db.js";
import { contractors } from "@8gent/db";
import { eq } from "drizzle-orm";
import { computeContractorScore } from "../services/telemetry/pipelines/scoring.js";

const SCORING_INTERVAL_MS = Number(process.env.SCORING_INTERVAL_MS) || 3_600_000;

export async function runScoringPipeline(): Promise<void> {
  const allContractors = await db
    .select()
    .from(contractors)
    .where(eq(contractors.status, "active"));

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  for (const contractor of allContractors) {
    try {
      const score = await computeContractorScore(contractor.id, thirtyDaysAgo);

      const normalizedRating = Math.min(5, Math.max(0, score.composite / 20));

      await db
        .update(contractors)
        .set({
          rating: normalizedRating.toFixed(2),
          updatedAt: new Date(),
        })
        .where(eq(contractors.id, contractor.id));
    } catch (err) {
      console.error(`Scoring failed for contractor ${contractor.id}:`, err);
    }
  }
}

let timer: ReturnType<typeof setInterval> | null = null;

export function startScoringWorker(): void {
  timer = setInterval(() => {
    runScoringPipeline().catch(console.error);
  }, SCORING_INTERVAL_MS);
}

export function stopScoringWorker(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
