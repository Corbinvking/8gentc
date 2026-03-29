import { db } from "../../lib/db.js";
import { agents } from "@8gent/db";
import { eq } from "drizzle-orm";

export interface ReconfigRecommendation {
  type: "create" | "deactivate" | "reconfigure";
  agentId?: string;
  reason: string;
  suggestedConfig?: Record<string, unknown>;
}

export async function evaluateReconfigurations(
  userId: string,
  newGoals: string[],
  completedGoals: string[]
): Promise<ReconfigRecommendation[]> {
  const recommendations: ReconfigRecommendation[] = [];

  const userAgents = await db
    .select()
    .from(agents)
    .where(eq(agents.ownerId, userId));

  for (const goal of newGoals) {
    const goalLower = goal.toLowerCase();
    const hasRelevantAgent = userAgents.some((a) => {
      const skills = (a.skills as string[]) ?? [];
      return skills.some((s) => goalLower.includes(s));
    });

    if (!hasRelevantAgent) {
      recommendations.push({
        type: "create",
        reason: `New goal detected: "${goal}". Consider creating an agent to help.`,
        suggestedConfig: { goal, skills: inferSkills(goal) },
      });
    }
  }

  for (const goal of completedGoals) {
    const relatedAgents = userAgents.filter((a) => {
      const agentConfig = a.config as Record<string, unknown>;
      return agentConfig?.goal === goal;
    });

    for (const agent of relatedAgents) {
      if (agent.status === "running" || agent.status === "idle") {
        recommendations.push({
          type: "deactivate",
          agentId: agent.id,
          reason: `Goal completed. Consider deactivating agent "${agent.name}".`,
        });
      }
    }
  }

  return recommendations;
}

function inferSkills(goal: string): string[] {
  const goalLower = goal.toLowerCase();
  const skills: string[] = [];

  if (/\b(code|develop|build|program|software)\b/.test(goalLower)) {
    skills.push("code-execution", "file-read");
  }
  if (/\b(research|learn|study|investigate)\b/.test(goalLower)) {
    skills.push("web-search", "summarize");
  }
  if (/\b(write|content|article|blog|document)\b/.test(goalLower)) {
    skills.push("summarize", "web-search");
  }

  return skills.length > 0 ? skills : ["web-search", "summarize"];
}
