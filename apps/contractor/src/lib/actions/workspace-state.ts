"use server";

import { db } from "@8gent/db/client";
import { taskSessions } from "@8gent/db/schema";
import { eq, and } from "drizzle-orm";
import { requireContractor } from "@/lib/auth";

export interface WorkspaceState {
  code: string;
  output: string;
  harnessType: string;
  promptHistory: string[];
  lastSavedAt: string;
}

export async function saveWorkspaceState(taskId: string, state: WorkspaceState) {
  const contractor = await requireContractor();

  const [session] = await db
    .select()
    .from(taskSessions)
    .where(
      and(
        eq(taskSessions.contractorId, contractor.id),
        eq(taskSessions.taskId, taskId),
        eq(taskSessions.status, "active")
      )
    )
    .limit(1);

  if (session) {
    await db
      .update(taskSessions)
      .set({
        workspaceSnapshot: JSON.stringify(state),
      })
      .where(eq(taskSessions.id, session.id));
  }

  return { success: true };
}

export async function loadWorkspaceState(taskId: string): Promise<WorkspaceState | null> {
  const contractor = await requireContractor();

  const [session] = await db
    .select()
    .from(taskSessions)
    .where(
      and(
        eq(taskSessions.contractorId, contractor.id),
        eq(taskSessions.taskId, taskId)
      )
    )
    .limit(1);

  if (session && (session as any).workspaceSnapshot) {
    try {
      return JSON.parse((session as any).workspaceSnapshot);
    } catch {
      return null;
    }
  }

  return null;
}
