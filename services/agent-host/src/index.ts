import Fastify from "fastify";
import cors from "@fastify/cors";
import { ContainerManager } from "./provisioner/container-manager.js";
import { HealthMonitor } from "./health/monitor.js";
import { Scaler } from "./scaling/scaler.js";
import { getLimitsForPlan, canSpawnAgent } from "./provisioner/resource-limits.js";
import type { UserPlan } from "@8gent/shared";

const PORT = Number(process.env.PORT) || 3003;

const app = Fastify({ logger: true });
await app.register(cors);

const containerManager = new ContainerManager();
const healthMonitor = new HealthMonitor(containerManager);
const scaler = new Scaler(containerManager);

healthMonitor.start();

app.get("/health", async () => {
  const metrics = scaler.getMetrics();
  return {
    status: "ok",
    service: "agent-host",
    containers: metrics.totalContainers,
    running: metrics.runningContainers,
  };
});

app.post("/containers/spawn", async (request, reply) => {
  const { userId, agentId, plan, image } = request.body as {
    userId: string;
    agentId: string;
    plan: UserPlan;
    image?: string;
  };

  const currentContainers = containerManager.listByUser(userId);
  if (!canSpawnAgent(plan, currentContainers.length)) {
    return reply.status(429).send({ error: "Agent limit reached for plan" });
  }

  const limits = getLimitsForPlan(plan);
  const container = await containerManager.spawn({
    userId,
    agentId,
    image: image ?? "8gent-agent:latest",
    memoryMb: limits.memoryPerAgentMb,
    cpuShares: limits.cpuSharesPerAgent,
    env: {
      AGENT_ID: agentId,
      USER_ID: userId,
      LLM_GATEWAY_URL: process.env.LLM_GATEWAY_URL ?? "http://llm-gateway:3002",
      ENGINE_API_URL: process.env.ENGINE_API_URL ?? "http://engine:3001",
    },
  });

  return reply.status(201).send(container);
});

app.post("/containers/:id/pause", async (request, reply) => {
  const { id } = request.params as { id: string };
  await containerManager.pause(id);
  return reply.send({ status: "paused" });
});

app.post("/containers/:id/resume", async (request, reply) => {
  const { id } = request.params as { id: string };
  await containerManager.unpause(id);
  return reply.send({ status: "running" });
});

app.delete("/containers/:id", async (request, reply) => {
  const { id } = request.params as { id: string };
  await containerManager.destroy(id);
  return reply.send({ status: "destroyed" });
});

app.get("/containers", async (request) => {
  const { userId } = request.query as { userId?: string };
  if (userId) {
    return containerManager.listByUser(userId);
  }
  return containerManager.listAll();
});

app.get("/containers/:id/stats", async (request) => {
  const { id } = request.params as { id: string };
  return containerManager.getContainerStats(id);
});

app.get("/metrics", async () => {
  return scaler.getMetrics();
});

app.get("/alerts", async () => {
  return scaler.evaluate();
});

const shutdown = async () => {
  healthMonitor.stop();
  await containerManager.destroyAll();
  await app.close();
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

try {
  await app.listen({ port: PORT, host: "0.0.0.0" });
  console.log(`Agent Host listening on port ${PORT}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
