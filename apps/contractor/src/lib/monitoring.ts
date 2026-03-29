import { db } from "@8gent/db/client";
import {
  contractors,
  contractorAvailability,
  taskOffers,
  taskSessions,
  deliverables,
  payouts,
} from "@8gent/db/schema";
import { eq, and, count, avg, sql, gte } from "drizzle-orm";

export async function getFleetHealthMetrics() {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  const [totalContractors] = await db
    .select({ value: count() })
    .from(contractors)
    .where(eq(contractors.status, "active"));

  const [onlineContractors] = await db
    .select({ value: count() })
    .from(contractorAvailability)
    .where(eq(contractorAvailability.isOnline, true));

  const [activeTaskCount] = await db
    .select({ value: count() })
    .from(taskOffers)
    .where(eq(taskOffers.status, "accepted"));

  const [pendingOffers] = await db
    .select({ value: count() })
    .from(taskOffers)
    .where(eq(taskOffers.status, "pending"));

  const [activeSessions] = await db
    .select({ value: count() })
    .from(taskSessions)
    .where(eq(taskSessions.status, "active"));

  const [pendingPayouts] = await db
    .select({ value: count() })
    .from(payouts)
    .where(eq(payouts.status, "pending"));

  return {
    totalContractors: totalContractors?.value ?? 0,
    onlineContractors: onlineContractors?.value ?? 0,
    activeTasks: activeTaskCount?.value ?? 0,
    pendingOffers: pendingOffers?.value ?? 0,
    activeSessions: activeSessions?.value ?? 0,
    pendingPayouts: pendingPayouts?.value ?? 0,
    utilizationRate:
      (totalContractors?.value ?? 0) > 0
        ? ((onlineContractors?.value ?? 0) / (totalContractors?.value ?? 1)) * 100
        : 0,
    timestamp: now,
  };
}

export async function getContractorManagementData() {
  const allContractors = await db
    .select({
      id: contractors.id,
      displayName: contractors.displayName,
      status: contractors.status,
      tier: contractors.tier,
      onboardingStatus: contractors.onboardingStatus,
      compositeScore: contractors.compositeScore,
      completedTasks: contractors.completedTasks,
      xp: contractors.xp,
      createdAt: contractors.createdAt,
    })
    .from(contractors)
    .orderBy(contractors.createdAt);

  return allContractors;
}

export async function getTaskMonitoringData() {
  const stuck = await db
    .select()
    .from(taskOffers)
    .where(
      and(
        eq(taskOffers.status, "accepted"),
        sql`${taskOffers.respondedAt} < NOW() - INTERVAL '24 hours'`
      )
    );

  const recentDeliverables = await db
    .select()
    .from(deliverables)
    .where(gte(deliverables.submittedAt, new Date(Date.now() - 24 * 60 * 60 * 1000)));

  return {
    stuckTasks: stuck,
    recentDeliverables,
  };
}
