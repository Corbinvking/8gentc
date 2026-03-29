import { nanoid } from "nanoid";
import { db } from "../../lib/db.js";
import { workstreams } from "@8gent/db";
import { eq } from "drizzle-orm";
import type { Workstream, WorkstreamDomain, WorkstreamStatus } from "@8gent/shared";

export interface CreateWorkstreamInput {
  taskId: string;
  title: string;
  description?: string;
  domain: WorkstreamDomain;
  complexityTier: number;
  estimatedTokens?: number;
  estimatedDurationMinutes?: number;
  dependencies?: string[];
  successCriteria?: string[];
}

export async function createWorkstream(input: CreateWorkstreamInput): Promise<Workstream> {
  const id = nanoid();
  const now = new Date();

  await db.insert(workstreams).values({
    id,
    taskId: input.taskId,
    title: input.title,
    description: input.description,
    domain: input.domain,
    complexityTier: input.complexityTier,
    estimatedTokens: input.estimatedTokens,
    estimatedDurationMinutes: input.estimatedDurationMinutes,
    dependencies: input.dependencies ?? [],
    successCriteria: input.successCriteria ?? [],
    status: "pending",
    createdAt: now,
    updatedAt: now,
  });

  return {
    id,
    taskId: input.taskId,
    title: input.title,
    description: input.description,
    domain: input.domain,
    complexityTier: input.complexityTier,
    estimatedTokens: input.estimatedTokens,
    estimatedDurationMinutes: input.estimatedDurationMinutes,
    dependencies: input.dependencies ?? [],
    successCriteria: input.successCriteria ?? [],
    status: "pending",
    createdAt: now,
    updatedAt: now,
  };
}

export async function getWorkstreamsByTask(taskId: string): Promise<Workstream[]> {
  const rows = await db.select().from(workstreams).where(eq(workstreams.taskId, taskId));
  return rows.map(mapRow);
}

export async function updateWorkstreamStatus(
  workstreamId: string,
  status: WorkstreamStatus
): Promise<void> {
  await db
    .update(workstreams)
    .set({ status, updatedAt: new Date() })
    .where(eq(workstreams.id, workstreamId));
}

export async function assignContractor(
  workstreamId: string,
  contractorId: string
): Promise<void> {
  await db
    .update(workstreams)
    .set({ assignedContractorId: contractorId, status: "assigned", updatedAt: new Date() })
    .where(eq(workstreams.id, workstreamId));
}

function mapRow(row: typeof workstreams.$inferSelect): Workstream {
  return {
    id: row.id,
    taskId: row.taskId,
    title: row.title,
    description: row.description ?? undefined,
    domain: row.domain as WorkstreamDomain,
    complexityTier: row.complexityTier,
    estimatedTokens: row.estimatedTokens ?? undefined,
    estimatedDurationMinutes: row.estimatedDurationMinutes ?? undefined,
    dependencies: (row.dependencies as string[]) ?? [],
    successCriteria: (row.successCriteria as string[]) ?? [],
    status: row.status as WorkstreamStatus,
    assignedContractorId: row.assignedContractorId ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
