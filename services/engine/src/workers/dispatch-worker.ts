import { db } from "../lib/db.js";
import { workstreams, contractors } from "@8gent/db";
import { eq } from "drizzle-orm";
import { dispatchWorkstreams, type ContractorProfile } from "../services/dispatch-matching/index.js";
import { platformBClient } from "@8gent/api-client";
import type { Workstream, WorkstreamDomain, WorkstreamStatus } from "@8gent/shared";

const DISPATCH_INTERVAL_MS = Number(process.env.DISPATCH_INTERVAL_MS) || 60_000;

export async function runDispatchCycle(): Promise<void> {
  const pending = await db
    .select()
    .from(workstreams)
    .where(eq(workstreams.status, "pending"));

  if (pending.length === 0) return;

  const allContractors = await db
    .select()
    .from(contractors)
    .where(eq(contractors.status, "active"));

  const profiles: ContractorProfile[] = allContractors.map((c) => ({
    id: c.id,
    userId: c.userId,
    displayName: c.displayName,
    skills: (c.skills as string[]) ?? [],
    rating: parseFloat(c.rating?.toString() ?? "0"),
    completedTasks: c.completedTasks ?? 0,
    status: c.status as "active",
    stripeConnectId: c.stripeConnectId ?? undefined,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    activeTasks: 0,
    maxConcurrentTasks: 5,
    compositeScore: 50,
    tokenEfficiencyScore: 50,
    availableHoursPerWeek: 40,
  }));

  const pendingWorkstreams: Workstream[] = pending.map((w) => ({
    id: w.id,
    taskId: w.taskId,
    title: w.title,
    description: w.description ?? undefined,
    domain: w.domain as WorkstreamDomain,
    complexityTier: w.complexityTier,
    estimatedTokens: w.estimatedTokens ?? undefined,
    estimatedDurationMinutes: w.estimatedDurationMinutes ?? undefined,
    dependencies: (w.dependencies as string[]) ?? [],
    successCriteria: (w.successCriteria as string[]) ?? [],
    status: w.status as WorkstreamStatus,
    assignedContractorId: w.assignedContractorId ?? undefined,
    createdAt: w.createdAt,
    updatedAt: w.updatedAt,
  }));

  const results = await dispatchWorkstreams(pendingWorkstreams, profiles);

  for (const result of results) {
    const ws = pending.find((w) => w.id === result.workstreamId);
    if (ws) {
      await platformBClient.pushTaskOffer(result.contractorId, {
        workstreamId: ws.id,
        title: ws.title,
        domain: ws.domain,
        complexityTier: ws.complexityTier,
        estimatedTokens: ws.estimatedTokens ?? undefined,
      }).catch(console.error);
    }
  }
}

let timer: ReturnType<typeof setInterval> | null = null;

export function startDispatchWorker(): void {
  timer = setInterval(() => {
    runDispatchCycle().catch(console.error);
  }, DISPATCH_INTERVAL_MS);
}

export function stopDispatchWorker(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
