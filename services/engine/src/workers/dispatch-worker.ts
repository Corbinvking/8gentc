// TODO: migrate to BullMQ/pg-boss for durable scheduling when user count exceeds 500
import { db } from "../lib/db.js";
import { workstreams, contractors } from "@8gent/db";
import { eq } from "drizzle-orm";
import { dispatchWorkstreams, type ContractorProfile } from "../services/dispatch-matching/index.js";
import { platformBClient, type AvailableContractor, type ScheduleEntry } from "@8gent/api-client";
import { withGracefulDegradation } from "../lib/graceful-degradation.js";
import type { Workstream, WorkstreamDomain, WorkstreamStatus } from "@8gent/shared";

const DISPATCH_INTERVAL_MS = Number(process.env.DISPATCH_INTERVAL_MS) || 60_000;

let isRunning = false;

async function fetchLiveContractorData(): Promise<{
  available: AvailableContractor[];
  schedule: ScheduleEntry[];
}> {
  const [available, schedule] = await Promise.all([
    withGracefulDegradation("platform-b-availability", () => platformBClient.getAvailableContractors(), [] as AvailableContractor[]),
    withGracefulDegradation("platform-b-schedule", () => platformBClient.getSchedule(), [] as ScheduleEntry[]),
  ]);
  return { available, schedule };
}

function buildScheduleMap(schedule: ScheduleEntry[]): Map<string, number> {
  const hoursMap = new Map<string, number>();
  for (const entry of schedule) {
    if (!entry.isOnline) continue;
    const start = new Date(entry.startTime).getTime();
    const end = new Date(entry.endTime).getTime();
    const hours = (end - start) / (1000 * 60 * 60);
    const current = hoursMap.get(entry.contractorId) ?? 0;
    hoursMap.set(entry.contractorId, current + Math.max(0, hours));
  }
  return hoursMap;
}

export async function runDispatchCycle(): Promise<void> {
  if (isRunning) {
    console.log("[dispatch] skipping — previous iteration still running");
    return;
  }
  isRunning = true;

  const startedAt = Date.now();
  let processed = 0;
  let errors = 0;

  try {
    const pending = await db
      .select()
      .from(workstreams)
      .where(eq(workstreams.status, "pending"));

    if (pending.length === 0) return;

    const { available, schedule } = await fetchLiveContractorData();
    const scheduleMap = buildScheduleMap(schedule);

    const liveContractorIds = new Set(available.map((c) => c.id));

    const allContractors = await db
      .select()
      .from(contractors)
      .where(eq(contractors.status, "active"));

    const profiles: ContractorProfile[] = allContractors.map((c) => {
      const live = available.find((a) => a.id === c.id);

      return {
        id: c.id,
        userId: c.userId,
        displayName: c.displayName,
        skills: live ? live.skills : ((c.skills as string[]) ?? []),
        rating: parseFloat(c.rating?.toString() ?? "0"),
        completedTasks: c.completedTasks ?? 0,
        status: c.status as "active",
        tier: (c.tier ?? "new") as import("@8gent/shared").ContractorTier,
        onboardingStatus: (c.onboardingStatus ?? "submitted") as import("@8gent/shared").OnboardingStatus,
        xp: c.xp ?? 0,
        currentStreak: c.currentStreak ?? 0,
        stripeConnectId: c.stripeConnectId ?? undefined,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        activeTasks: live?.currentTaskCount ?? 0,
        maxConcurrentTasks: 5,
        compositeScore: live?.compositeScore ?? 50,
        tokenEfficiencyScore: 50,
        availableHoursPerWeek: scheduleMap.get(c.id) ?? (live?.isOnline ? 40 : 0),
      };
    }).filter((p) => {
      if (liveContractorIds.size > 0) {
        return liveContractorIds.has(p.id);
      }
      return true;
    });

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
        try {
          await platformBClient.pushTaskOffer(result.contractorId, {
            workstreamId: ws.id,
            title: ws.title,
            domain: ws.domain,
            complexityTier: ws.complexityTier,
            estimatedTokens: ws.estimatedTokens ?? undefined,
          });
          processed++;
        } catch (err) {
          errors++;
          console.error(`Failed to push offer for workstream ${ws.id}:`, err);
        }
      }
    }
  } finally {
    isRunning = false;
    const durationMs = Date.now() - startedAt;
    console.log(
      JSON.stringify({
        worker: "dispatch",
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
