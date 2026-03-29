import { db } from "../lib/db.js";
import { agents, agentOutputs } from "@8gent/db";
import { eq } from "drizzle-orm";
import { callLLM } from "../lib/llm-client.js";
import { nanoid } from "nanoid";

const HEARTBEAT_INTERVAL_MS = Number(process.env.AGENT_HEARTBEAT_INTERVAL_MS) || 300_000;

export async function runAgentHeartbeats(): Promise<void> {
  const runningAgents = await db
    .select()
    .from(agents)
    .where(eq(agents.status, "running"));

  for (const agent of runningAgents) {
    try {
      const config = agent.config as Record<string, unknown>;
      const prompt = `You are agent "${agent.name}". Review your current state and produce any outputs or updates. Skills: ${JSON.stringify(agent.skills)}. Configuration: ${JSON.stringify(config)}`;

      const result = await callLLM({
        prompt,
        taskType: "standard",
        userId: agent.ownerId,
        agentId: agent.id,
      });

      if (result.response.trim()) {
        await db.insert(agentOutputs).values({
          id: nanoid(),
          agentId: agent.id,
          type: "text",
          content: result.response,
          metadata: { tokensUsed: result.inputTokens + result.outputTokens },
          createdAt: new Date(),
        });
      }

      await db
        .update(agents)
        .set({ updatedAt: new Date() })
        .where(eq(agents.id, agent.id));
    } catch (err) {
      console.error(`Heartbeat failed for agent ${agent.id}:`, err);
      await db
        .update(agents)
        .set({ status: "error", updatedAt: new Date() })
        .where(eq(agents.id, agent.id));
    }
  }
}

let timer: ReturnType<typeof setInterval> | null = null;

export function startHeartbeatWorker(): void {
  timer = setInterval(() => {
    runAgentHeartbeats().catch(console.error);
  }, HEARTBEAT_INTERVAL_MS);
}

export function stopHeartbeatWorker(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
