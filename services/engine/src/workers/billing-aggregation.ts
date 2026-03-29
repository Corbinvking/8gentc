import { db } from "../lib/db.js";
import { users, subscriptions } from "@8gent/db";
import { eq } from "drizzle-orm";
import { aggregateBilling, createUsageRecord } from "../services/telemetry/pipelines/billing.js";

const BILLING_INTERVAL_MS = Number(process.env.BILLING_INTERVAL_MS) || 3_600_000;

export async function runBillingAggregation(): Promise<void> {
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
    } catch (err) {
      console.error(`Billing aggregation failed for user ${sub.userId}:`, err);
    }
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
