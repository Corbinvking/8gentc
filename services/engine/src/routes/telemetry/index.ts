import type { FastifyInstance } from "fastify";
import { ingestEvent, ingestBatch } from "../../services/telemetry/ingestion.js";
import { computeContractorScore } from "../../services/telemetry/pipelines/scoring.js";
import { analyzeQuality } from "../../services/telemetry/pipelines/quality.js";
import type { TelemetryEventType } from "@8gent/shared";

export async function telemetryRoutes(app: FastifyInstance): Promise<void> {
  app.post("/telemetry/prompt", async (request, reply) => {
    const body = request.body as {
      userId?: string;
      agentId?: string;
      taskId?: string;
      contractorId?: string;
      payload: Record<string, unknown>;
    };

    const id = await ingestEvent({
      type: "llm.call",
      ...body,
    });

    return reply.status(201).send({ id });
  });

  app.post("/telemetry/llm-call", async (request, reply) => {
    const body = request.body as {
      userId?: string;
      agentId?: string;
      taskId?: string;
      contractorId?: string;
      payload: Record<string, unknown>;
    };

    const id = await ingestEvent({
      type: "llm.call",
      ...body,
    });

    return reply.status(201).send({ id });
  });

  app.post("/telemetry/session", async (request, reply) => {
    const body = request.body as {
      type: TelemetryEventType;
      userId?: string;
      agentId?: string;
      taskId?: string;
      contractorId?: string;
      payload: Record<string, unknown>;
    };

    const id = await ingestEvent(body);
    return reply.status(201).send({ id });
  });

  app.post("/telemetry/batch", async (request, reply) => {
    const { events } = request.body as {
      events: Array<{
        type: TelemetryEventType;
        userId?: string;
        agentId?: string;
        taskId?: string;
        contractorId?: string;
        payload: Record<string, unknown>;
      }>;
    };

    const ids = await ingestBatch(events);
    return reply.status(201).send({ ids });
  });

  app.get("/telemetry/scores/:contractorId", async (request) => {
    const { contractorId } = request.params as { contractorId: string };
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return computeContractorScore(contractorId, thirtyDaysAgo);
  });

  app.get("/telemetry/benchmarks/:taskType", async (request) => {
    const { taskType } = request.params as { taskType: string };
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const quality = await analyzeQuality(thirtyDaysAgo, new Date());

    return {
      taskType,
      benchmarks: quality,
    };
  });
}
