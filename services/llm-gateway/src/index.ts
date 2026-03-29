import Fastify from "fastify";
import cors from "@fastify/cors";
import { z } from "zod";
import Redis from "ioredis";
import postgres from "postgres";
import { LLMRouter } from "./router/index.js";
import { AnthropicProvider, OpenAIProvider, GoogleProvider, calculateCost } from "./providers/index.js";
import { SemanticCache } from "./cache/index.js";
import { BudgetEnforcer } from "./budget/index.js";
import { LLMMeter } from "./metering/index.js";
import type { LLMCompletionResponse } from "@8gent/shared";

const PORT = Number(process.env.PORT) || 3002;
const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";
const DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/8gent";

const app = Fastify({ logger: true });
await app.register(cors);

app.setErrorHandler((error, request, reply) => {
  request.log.error(error);
  reply.status(error.statusCode ?? 500).send({
    error: error.message,
    statusCode: error.statusCode ?? 500,
    service: "llm-gateway",
  });
});

const router = new LLMRouter();
router.registerProvider(new AnthropicProvider());
router.registerProvider(new OpenAIProvider());
router.registerProvider(new GoogleProvider());
router.setProviderPriority(["anthropic", "openai", "google"]);

const cache = new SemanticCache(REDIS_URL);
const budget = new BudgetEnforcer(REDIS_URL);
const meter = new LLMMeter(DATABASE_URL);

const completionSchema = z.object({
  prompt: z.string().min(1),
  context: z.string().optional(),
  taskType: z.string().optional(),
  priority: z.enum(["low", "normal", "high"]).optional(),
  userId: z.string().min(1),
  agentId: z.string().optional(),
  budgetRemaining: z.number().optional(),
  maxTokens: z.number().optional(),
  temperature: z.number().optional(),
  systemPrompt: z.string().optional(),
  stream: z.boolean().optional(),
});

app.post("/llm/complete", async (request, reply) => {
  const parsed = completionSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({ error: "Invalid request", details: parsed.error.flatten() });
  }

  const { prompt, context, taskType, userId, agentId, maxTokens, temperature, systemPrompt, stream } = parsed.data;

  const budgetCheck = await budget.checkBudget(userId, agentId, maxTokens ?? 4096);
  if (!budgetCheck.allowed) {
    return reply.status(429).send({
      error: "Budget exceeded",
      warning: budgetCheck.warning,
      userStatus: budgetCheck.userStatus,
    });
  }

  if (stream) {
    return handleStreamingRequest(request, reply, parsed.data, budgetCheck);
  }

  const cached = await cache.get(userId, prompt, systemPrompt);
  if (cached) {
    const response: LLMCompletionResponse = {
      response: cached.response,
      modelUsed: cached.model,
      provider: "cache" as never,
      inputTokens: cached.inputTokens,
      outputTokens: cached.outputTokens,
      cost: 0,
      latencyMs: 0,
      cacheHit: true,
    };

    meter.record(userId, agentId, undefined, "cache", response, taskType);
    return reply.send(response);
  }

  const fullPrompt = context ? `${context}\n\n${prompt}` : prompt;
  const start = Date.now();

  const result = await router.execute(
    { prompt: fullPrompt, systemPrompt, maxTokens, temperature },
    taskType,
    context?.length
  );

  const cost = calculateCost(
    result.response.model,
    result.response.inputTokens,
    result.response.outputTokens
  );

  const latencyMs = Date.now() - start;

  const response: LLMCompletionResponse = {
    response: result.response.text,
    modelUsed: result.response.model,
    provider: result.provider as never,
    inputTokens: result.response.inputTokens,
    outputTokens: result.response.outputTokens,
    cost,
    latencyMs,
    cacheHit: false,
  };

  await Promise.all([
    budget.recordUsage(
      userId,
      agentId,
      result.response.inputTokens + result.response.outputTokens
    ),
    cache.set(userId, prompt, systemPrompt, {
      response: result.response.text,
      model: result.response.model,
      inputTokens: result.response.inputTokens,
      outputTokens: result.response.outputTokens,
      cachedAt: Date.now(),
    }, taskType),
  ]);

  meter.record(userId, agentId, undefined, result.provider, response, taskType);

  if (budgetCheck.warning) {
    return reply.send({ ...response, warning: budgetCheck.warning });
  }

  return reply.send(response);
});

async function handleStreamingRequest(
  request: any,
  reply: any,
  data: z.infer<typeof completionSchema>,
  budgetCheck: any
) {
  const { prompt, context, taskType, userId, agentId, maxTokens, temperature, systemPrompt } = data;
  const fullPrompt = context ? `${context}\n\n${prompt}` : prompt;
  const start = Date.now();

  reply.raw.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  try {
    const gen = router.executeStream(
      { prompt: fullPrompt, systemPrompt, maxTokens, temperature },
      taskType,
      context?.length
    );

    let result: IteratorResult<string, { response: any; provider: string; tier: string }>;

    do {
      result = await gen.next();
      if (!result.done && typeof result.value === "string") {
        reply.raw.write(`data: ${JSON.stringify({ type: "text", content: result.value })}\n\n`);
      }
    } while (!result.done);

    const finalResult = result.value;
    const cost = calculateCost(
      finalResult.response.model,
      finalResult.response.inputTokens,
      finalResult.response.outputTokens
    );

    await Promise.all([
      budget.recordUsage(
        userId,
        agentId,
        finalResult.response.inputTokens + finalResult.response.outputTokens
      ),
      cache.set(userId, prompt, systemPrompt, {
        response: finalResult.response.text,
        model: finalResult.response.model,
        inputTokens: finalResult.response.inputTokens,
        outputTokens: finalResult.response.outputTokens,
        cachedAt: Date.now(),
      }, taskType),
    ]);

    const completionResponse: LLMCompletionResponse = {
      response: finalResult.response.text,
      modelUsed: finalResult.response.model,
      provider: finalResult.provider as never,
      inputTokens: finalResult.response.inputTokens,
      outputTokens: finalResult.response.outputTokens,
      cost,
      latencyMs: Date.now() - start,
      cacheHit: false,
    };

    meter.record(userId, agentId, undefined, finalResult.provider, completionResponse, taskType);

    reply.raw.write(
      `data: ${JSON.stringify({ type: "done", ...completionResponse })}\n\n`
    );
  } catch (err) {
    reply.raw.write(
      `data: ${JSON.stringify({ type: "error", message: (err as Error).message })}\n\n`
    );
  }

  reply.raw.end();
}

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
    service: "llm-gateway",
    providers: router.listProviders(),
    cacheStats: cache.getStats(),
    dependencies: { redis: redisOk, database: dbOk },
  };
});

app.get("/llm/providers", async () => {
  const healthChecks = await Promise.allSettled(
    router.listProviders().map(async (name) => {
      const provider = router.getProvider(name);
      const health = await provider?.healthCheck();
      return { name, health };
    })
  );

  return healthChecks.map((r) =>
    r.status === "fulfilled" ? r.value : { name: "unknown", health: null }
  );
});

app.get("/llm/usage/:userId", async (request, reply) => {
  const { userId } = request.params as { userId: string };
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const usage = await meter.getUsage(userId, periodStart, now);
  return reply.send(usage);
});

const shutdown = async () => {
  await meter.shutdown();
  await cache.disconnect();
  await budget.disconnect();
  await app.close();
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

try {
  await app.listen({ port: PORT, host: "0.0.0.0" });
  console.log(`LLM Gateway listening on port ${PORT}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
