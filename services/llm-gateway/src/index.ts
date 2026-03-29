import Fastify from "fastify";
import cors from "@fastify/cors";

const PORT = Number(process.env.PORT) || 3002;

const app = Fastify({ logger: true });

await app.register(cors);

app.get("/health", async () => {
  return { status: "ok", service: "llm-gateway" };
});

try {
  await app.listen({ port: PORT, host: "0.0.0.0" });
  console.log(`LLM Gateway listening on port ${PORT}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
