// TODO: migrate to BullMQ/pg-boss for durable scheduling when user count exceeds 500
import { db } from "../lib/db.js";
import { subscriptions } from "@8gent/db";
import { eq } from "drizzle-orm";
import { aggregateBilling, createUsageRecord } from "../services/telemetry/pipelines/billing.js";

const BILLING_INTERVAL_MS = Number(process.env.BILLING_INTERVAL_MS) || 3_600_000;

let isRunning = false;

export async function runBillingAggregation(): Promise<void> {
  if (isRunning) {
    console.log("[billing] skipping — previous iteration still running");
    return;
  }
  isRunning = true;

  const startedAt = Date.now();
  let processed = 0;
  let errors = 0;

  try {
    const activeSubscriptions = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.status, "active"));

    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);

    for (const sub of activeSubscriptions) {
      try {
        const billing = await aggregateBilling(sub.userId, periodStart, now);

        if (billing.totalCalls > 0) {
          await createUsageRecord(
            sub.userId,
            "llm_tokens",
            billing.totalTokensIn + billing.totalTokensOut,
            billing.totalCost / (billing.totalTokensIn + billing.totalTokensOut || 1)
          );
        }

        processed++;
      } catch (err) {
        errors++;
        console.error(`Billing aggregation failed for user ${sub.userId}:`, err);
      }
    }
  } finally {
    isRunning = false;
    const durationMs = Date.now() - startedAt;
    console.log(
      JSON.stringify({
        worker: "billing",
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

export function startBillingWorker(): void {
  timer = setInterval(() => {
    runBillingAggregation().catch(console.error);
  }, BILLING_INTERVAL_MS);
}

export function stopBillingWorker(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
