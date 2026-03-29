import { nanoid } from "nanoid";
import { db } from "../../lib/db.js";
import { telemetryEvents } from "@8gent/db";
import type { TelemetryEventType } from "@8gent/shared";

export interface IngestEvent {
  type: TelemetryEventType;
  userId?: string;
  agentId?: string;
  taskId?: string;
  contractorId?: string;
  payload: Record<string, unknown>;
}

export async function ingestEvent(event: IngestEvent): Promise<string> {
  const id = nanoid();
  await db.insert(telemetryEvents).values({
    id,
    type: event.type,
    userId: event.userId,
    agentId: event.agentId,
    taskId: event.taskId,
    contractorId: event.contractorId,
    payload: event.payload,
    timestamp: new Date(),
  });
  return id;
}

export async function ingestBatch(events: IngestEvent[]): Promise<string[]> {
  const ids = events.map(() => nanoid());
  const values = events.map((event, i) => ({
    id: ids[i],
    type: event.type,
    userId: event.userId,
    agentId: event.agentId,
    taskId: event.taskId,
    contractorId: event.contractorId,
    payload: event.payload,
    timestamp: new Date(),
  }));

  await db.insert(telemetryEvents).values(values);
  return ids;
}
