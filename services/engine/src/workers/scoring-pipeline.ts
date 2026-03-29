// TODO: migrate to BullMQ/pg-boss for durable scheduling when user count exceeds 500
import { db } from "../lib/db.js";
import { contractors } from "@8gent/db";
import { eq } from "drizzle-orm";
import { computeContractorScore } from "../services/telemetry/pipelines/scoring.js";

const SCORING_INTERVAL_MS = Number(process.env.SCORING_INTERVAL_MS) || 3_600_000;

let isRunning = false;

export async function runScoringPipeline(): Promise<void> {
  if (isRunning) {
    console.log("[scoring] skipping — previous iteration still running");
    return;
  }
  isRunning = true;

  const startedAt = Date.now();
  let processed = 0;
  let errors = 0;

  try {
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

        processed++;
      } catch (err) {
        errors++;
        console.error(`Scoring failed for contractor ${contractor.id}:`, err);
      }
    }
  } finally {
    isRunning = false;
    const durationMs = Date.now() - startedAt;
    console.log(
      JSON.stringify({
        worker: "scoring",
        startedAt: new Date(startedAt).toISOString(),
        completedAt: new Date().toISOString(),
        durationMs,
        itemsProcessed: processed,
        errors,
      })
    );
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
