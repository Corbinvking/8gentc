// TODO: migrate to BullMQ/pg-boss for durable scheduling when user count exceeds 500
import { db } from "../lib/db.js";
import { agents, agentOutputs } from "@8gent/db";
import { eq } from "drizzle-orm";
import { callLLM } from "../lib/llm-client.js";
import { nanoid } from "nanoid";
import { SkillRegistry, builtInSkills } from "@8gent/8gentc";

const CHECK_INTERVAL_MS = Number(process.env.AGENT_HEARTBEAT_CHECK_MS) || 30_000;

let isRunning = false;
const lastHeartbeatAt = new Map<string, number>();

const skillRegistry = new SkillRegistry();
for (const skill of builtInSkills) {
  skillRegistry.register(skill);
}

export async function runAgentHeartbeats(): Promise<void> {
  if (isRunning) {
    console.log("[heartbeat] skipping — previous iteration still running");
    return;
  }
  isRunning = true;

  const startedAt = Date.now();
  let processed = 0;
  let errors = 0;

  try {
    const runningAgents = await db
      .select()
      .from(agents)
      .where(eq(agents.status, "running"));

    const now = Date.now();

    for (const agent of runningAgents) {
      const config = agent.config as Record<string, unknown>;
      const intervalMs = Number(config.heartbeatIntervalMs) || 300_000;
      const lastBeat = lastHeartbeatAt.get(agent.id) ?? 0;

      if (now - lastBeat < intervalMs) continue;

      try {
        const agentSkills = (agent.skills as string[]) ?? [];
        const skillResults: Array<{ skillId: string; result: unknown }> = [];

        for (const skillId of agentSkills) {
          const skill = skillRegistry.get(skillId);
          if (!skill || skill.stub) continue;

          const result = await skillRegistry.execute(skillId, {
            agentId: agent.id,
            userId: agent.ownerId,
            input: config.skillInput ?? config.lastContext ?? "",
            config,
          });

          if (result.success) {
            skillResults.push({ skillId, result: result.output });
          }
        }

        const skillContext = skillResults.length > 0
          ? `\n\nSkill execution results:\n${JSON.stringify(skillResults, null, 2)}`
          : "";

        const prompt = `You are agent "${agent.name}". Review your current state and produce any outputs or updates. Skills: ${JSON.stringify(agentSkills)}. Configuration: ${JSON.stringify(config)}${skillContext}`;

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
            type: skillResults.length > 0 ? "skill_execution" : "text",
            content: result.response,
            metadata: {
              tokensUsed: result.inputTokens + result.outputTokens,
              skillsExecuted: skillResults.map((s) => s.skillId),
            },
            createdAt: new Date(),
          });
        }

        await db
          .update(agents)
          .set({ updatedAt: new Date() })
          .where(eq(agents.id, agent.id));

        lastHeartbeatAt.set(agent.id, now);
        processed++;
      } catch (err) {
        errors++;
        console.error(`Heartbeat failed for agent ${agent.id}:`, err);
        await db
          .update(agents)
          .set({ status: "error", updatedAt: new Date() })
          .where(eq(agents.id, agent.id));
      }
    }
  } finally {
    isRunning = false;
    const durationMs = Date.now() - startedAt;
    console.log(
      JSON.stringify({
        worker: "heartbeat",
        startedAt: new Date(startedAt).toISOString(),
        completedAt: new Date().toISOString(),
        durationMs,
        itemsProcessed: processed,
        errors,
      })
    );
  }
}

let timer: ReturnType<typeof setInterval> | null = null;

export function startHeartbeatWorker(): void {
  timer = setInterval(() => {
    runAgentHeartbeats().catch(console.error);
  }, CHECK_INTERVAL_MS);
}

export function stopHeartbeatWorker(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
