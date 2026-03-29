import Fastify from "fastify";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
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

const PORT = Number(process.env.PORT) || 3001;

const app = Fastify({ logger: true });

await app.register(cors);
await app.register(websocket);
await registerRateLimit(app);

app.get("/health", async () => {
  return { status: "ok", service: "engine" };
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

const shutdown = async () => {
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
