import Fastify from "fastify";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import Redis from "ioredis";
import postgres from "postgres";
import { registerRateLimit } from "./middleware/rate-limit.js";
import { authMiddleware } from "./middleware/auth.js";
import { auditLog } from "./middleware/audit-log.js";
import { chatRoutes } from "./routes/chat/index.js";
import { agentRoutes } from "./routes/agents/index.js";
import { understandingRoutes } from "./routes/understanding/index.js";
import { meteringRoutes } from "./routes/metering/index.js";
import { taskRoutes } from "./routes/tasks/index.js";
import { dispatchRoutes } from "./routes/dispatch/index.js";
import { telemetryRoutes } from "./routes/telemetry/index.js";
import { registerHealthAwareRoutes } from "./lib/graceful-degradation.js";
import { generateOpenAPISpec } from "./lib/openapi.js";
import { startHeartbeatWorker, stopHeartbeatWorker } from "./workers/agent-heartbeat.js";
import { startUnderstandingWorker, stopUnderstandingWorker } from "./workers/understanding-analysis.js";
import { startDispatchWorker, stopDispatchWorker } from "./workers/dispatch-worker.js";
import { startScoringWorker, stopScoringWorker } from "./workers/scoring-pipeline.js";
import { startBillingWorker, stopBillingWorker } from "./workers/billing-aggregation.js";

const PORT = Number(process.env.PORT) || 3001;
const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";
const DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/8gent";

const app = Fastify({ logger: true });

app.setErrorHandler((error, request, reply) => {
  request.log.error(error);
  const statusCode = error.statusCode ?? 500;
  reply.status(statusCode).send({
    error: statusCode >= 500 ? "Internal server error" : error.message,
    statusCode,
    service: "engine",
    ...(statusCode < 500 ? { details: error.message } : {}),
  });
});

await app.register(cors);
await app.register(websocket);
await registerRateLimit(app);

app.get("/health", async () => {
  let redisOk = false;
  let dbOk = false;

  try {
    const redis = new Redis(REDIS_URL);
    await redis.ping();
    redis.disconnect();
    redisOk = true;
  } catch { /* redis down */ }

  try {
    const client = postgres(DATABASE_URL);
    await client`SELECT 1`;
    await client.end();
    dbOk = true;
  } catch { /* db down */ }

  return {
    status: redisOk && dbOk ? "ok" : "degraded",
    service: "engine",
    dependencies: { redis: redisOk, database: dbOk },
    workers: {
      heartbeat: true,
      understanding: true,
      dispatch: true,
      scoring: true,
      billing: true,
    },
  };
});

app.get("/openapi.json", async () => {
  return generateOpenAPISpec(app);
});

registerHealthAwareRoutes(app);

app.addHook("onRequest", authMiddleware);
app.addHook("onRequest", auditLog);

await app.register(chatRoutes);
await app.register(agentRoutes);
await app.register(understandingRoutes);
await app.register(meteringRoutes);
await app.register(taskRoutes);
await app.register(dispatchRoutes);
await app.register(telemetryRoutes);

startHeartbeatWorker();
startUnderstandingWorker();
startDispatchWorker();
startScoringWorker();
startBillingWorker();

app.log.info("All background workers started");

const shutdown = async () => {
  stopHeartbeatWorker();
  stopUnderstandingWorker();
  stopDispatchWorker();
  stopScoringWorker();
  stopBillingWorker();
  app.log.info("All background workers stopped");
  await app.close();
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

try {
  await app.listen({ port: PORT, host: "0.0.0.0" });
  console.log(`Engine API listening on port ${PORT}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
