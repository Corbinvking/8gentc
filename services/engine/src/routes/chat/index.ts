import type { FastifyInstance } from "fastify";
import { streamLLM, callLLM } from "../../lib/llm-client.js";
import { db } from "../../lib/db.js";
import { notes, agents } from "@8gent/db";
import { eq } from "drizzle-orm";

export async function chatRoutes(app: FastifyInstance): Promise<void> {
  app.post("/chat/message", async (request, reply) => {
    const { message, workspaceId, conversationHistory } = request.body as {
      message: string;
      workspaceId: string;
      conversationHistory?: Array<{ role: string; content: string }>;
    };

    const userId = request.authUser!.userId;

    const userNotes = await db
      .select()
      .from(notes)
      .where(eq(notes.workspaceId, workspaceId))
      .limit(20);

    const userAgents = await db
      .select()
      .from(agents)
      .where(eq(agents.ownerId, userId));

    const knowledgeContext = userNotes
      .map((n) => `- ${n.title}: ${(n.content ?? "").slice(0, 150)}`)
      .join("\n");

    const agentContext = userAgents
      .map((a) => `- ${a.name} (${a.status}): ${JSON.stringify(a.skills)}`)
      .join("\n");

    const history = conversationHistory
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

    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    try {
      let fullResponse = "";

      for await (const event of streamLLM({
        prompt: message,
        systemPrompt,
        taskType: "standard",
        userId,
        temperature: 0.7,
      })) {
        if (event.type === "text" && event.content) {
          fullResponse += event.content;
          reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
        } else if (event.type === "done") {
          const jsonMatch = fullResponse.match(/\{[\s\S]*"goals"[\s\S]*\}/);
          if (jsonMatch) {
            try {
              const parsed = JSON.parse(jsonMatch[0]);
              if (parsed.goals?.length) {
                reply.raw.write(
                  `data: ${JSON.stringify({ type: "goals", goals: parsed.goals })}\n\n`
                );
              }
              if (parsed.agentReconfigs?.length) {
                reply.raw.write(
                  `data: ${JSON.stringify({ type: "reconfigs", reconfigs: parsed.agentReconfigs })}\n\n`
                );
              }
            } catch { /* skip if JSON parsing fails */ }
          }

          reply.raw.write(
            `data: ${JSON.stringify({
              type: "done",
              modelUsed: event.modelUsed,
              tokensUsed: (event.inputTokens as number ?? 0) + (event.outputTokens as number ?? 0),
            })}\n\n`
          );
        } else if (event.type === "error") {
          reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
        }
      }
    } catch (err) {
      reply.raw.write(
        `data: ${JSON.stringify({ type: "error", message: (err as Error).message })}\n\n`
      );
    }

    reply.raw.end();
  });
}
