"use server";

import { db } from "@8gent/db/client";
import { taskSessions } from "@8gent/db/schema";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import { requireContractor } from "@/lib/auth";
import { platformCClient } from "@8gent/api-client/platform-c";

export async function startSession(taskId: string, harnessType: string) {
  const contractor = await requireContractor();

  const sessionId = nanoid();
  await db.insert(taskSessions).values({
    id: sessionId,
    taskId,
    contractorId: contractor.id,
    harnessType,
    startedAt: new Date(),
    status: "active",
  });

  try {
    await platformCClient.logSession({
      contractorId: contractor.id,
      taskId,
      event: "start",
      timestamp: new Date(),
    });
  } catch {
    // non-critical
  }

  return { sessionId };
}

export async function endSession(sessionId: string) {
  const contractor = await requireContractor();

  const [session] = await db
    .select()
    .from(taskSessions)
    .where(and(eq(taskSessions.id, sessionId), eq(taskSessions.contractorId, contractor.id)))
    .limit(1);

  if (!session) return { error: "Session not found" };

  await db
    .update(taskSessions)
    .set({ endedAt: new Date(), status: "completed" })
    .where(eq(taskSessions.id, sessionId));

  try {
    await platformCClient.logSession({
      contractorId: contractor.id,
      taskId: session.taskId,
      event: "submit",
      timestamp: new Date(),
    });
  } catch {
    // non-critical
  }

  return { success: true };
}

export async function capturePrompt(taskId: string, harnessType: string, promptText: string) {
  const contractor = await requireContractor();

  try {
    await platformCClient.logPrompt({
      contractorId: contractor.id,
      taskId,
      harnessType,
      promptText,
      tokenCount: Math.ceil(promptText.length / 4),
      timestamp: new Date(),
    });
  } catch {
    // non-critical
  }
}

export async function captureLlmCall(
  taskId: string,
  data: { model: string; inputTokens: number; outputTokens: number; latencyMs: number; cost: number }
) {
  const contractor = await requireContractor();

  const [session] = await db
    .select()
    .from(taskSessions)
    .where(and(eq(taskSessions.contractorId, contractor.id), eq(taskSessions.taskId, taskId), eq(taskSessions.status, "active")))
    .limit(1);

  if (session) {
    await db
      .update(taskSessions)
      .set({
        totalTokensUsed: (session.totalTokensUsed ?? 0) + data.inputTokens + data.outputTokens,
        totalCost: String(Number(session.totalCost ?? 0) + data.cost),
      })
      .where(eq(taskSessions.id, session.id));
  }

  try {
    await platformCClient.logLlmCall({
      contractorId: contractor.id,
      taskId,
      ...data,
      timestamp: new Date(),
    });
  } catch {
    // non-critical
  }
}
