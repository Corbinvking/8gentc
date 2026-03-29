import { callLLM } from "../../lib/llm-client.js";
import { db } from "../../lib/db.js";
import { notes, agents } from "@8gent/db";
import { eq } from "drizzle-orm";

export interface ChatContext {
  userId: string;
  workspaceId: string;
  message: string;
  conversationHistory?: Array<{ role: string; content: string }>;
}

export interface ChatResult {
  response: string;
  extractedGoals: string[];
  extractedIntentions: string[];
  suggestedAgentReconfigs: Array<{ agentId: string; suggestion: string }>;
  modelUsed: string;
  tokensUsed: number;
}

export async function processChat(ctx: ChatContext): Promise<ChatResult> {
  const userNotes = await db
    .select()
    .from(notes)
    .where(eq(notes.workspaceId, ctx.workspaceId))
    .limit(20);

  const userAgents = await db
    .select()
    .from(agents)
    .where(eq(agents.ownerId, ctx.userId));

  const knowledgeContext = userNotes
    .map((n) => `- ${n.title}: ${(n.content ?? "").slice(0, 150)}`)
    .join("\n");

  const agentContext = userAgents
    .map((a) => `- ${a.name} (${a.status}): ${JSON.stringify(a.skills)}`)
    .join("\n");

  const history = ctx.conversationHistory
    ?.map((m) => `${m.role}: ${m.content}`)
    .join("\n") ?? "";

  const systemPrompt = `You are 8gent, an intelligent personal assistant. You have access to the user's knowledge workspace and active agents.

The user's notes include:
${knowledgeContext || "No notes yet."}

Active agents:
${agentContext || "No active agents."}

${history ? `Conversation history:\n${history}\n` : ""}

Instructions:
1. Respond helpfully and contextually
2. If the user mentions a new goal, note it
3. If something relates to an existing note, reference it
4. After your response, add a JSON block with extracted info:
{"goals":["..."],"intentions":["..."],"agentReconfigs":[{"agentId":"...","suggestion":"..."}]}`;

  const result = await callLLM({
    prompt: ctx.message,
    systemPrompt,
    taskType: "standard",
    userId: ctx.userId,
    temperature: 0.7,
  });

  let extractedGoals: string[] = [];
  let extractedIntentions: string[] = [];
  let suggestedAgentReconfigs: Array<{ agentId: string; suggestion: string }> = [];
  let responseText = result.response;

  const jsonMatch = result.response.match(/\{[\s\S]*"goals"[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      extractedGoals = parsed.goals ?? [];
      extractedIntentions = parsed.intentions ?? [];
      suggestedAgentReconfigs = parsed.agentReconfigs ?? [];
      responseText = result.response.slice(0, jsonMatch.index).trim();
    } catch {
      // keep full response if JSON parsing fails
    }
  }

  return {
    response: responseText,
    extractedGoals,
    extractedIntentions,
    suggestedAgentReconfigs,
    modelUsed: result.modelUsed,
    tokensUsed: result.inputTokens + result.outputTokens,
  };
}
