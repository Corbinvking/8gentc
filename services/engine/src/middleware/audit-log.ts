import type { FastifyRequest, FastifyReply } from "fastify";
import { ingestEvent } from "../services/telemetry/ingestion.js";

export async function auditLog(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  const userId = request.authUser?.userId;
  if (!userId) return;

  const mutatingMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);
  if (!mutatingMethods.has(request.method)) return;

  await ingestEvent({
    type: "task.created",
    userId,
    payload: {
      action: `${request.method} ${request.url}`,
      ip: request.ip,
      userAgent: request.headers["user-agent"] ?? "unknown",
      timestamp: new Date().toISOString(),
    },
  }).catch(() => {});
}
