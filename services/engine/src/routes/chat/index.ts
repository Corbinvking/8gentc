import type { FastifyInstance } from "fastify";
import { processChat } from "../../services/understanding-engine/chat-intelligence.js";

export async function chatRoutes(app: FastifyInstance): Promise<void> {
  app.post("/chat/message", async (request, reply) => {
    const { message, workspaceId, conversationHistory } = request.body as {
      message: string;
      workspaceId: string;
      conversationHistory?: Array<{ role: string; content: string }>;
    };

    const userId = request.authUser!.userId;

    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    try {
      const result = await processChat({
        userId,
        workspaceId,
        message,
        conversationHistory,
      });

      const chunks = chunkText(result.response, 50);
      for (const chunk of chunks) {
        reply.raw.write(`data: ${JSON.stringify({ type: "text", content: chunk })}\n\n`);
      }

      if (result.extractedGoals.length > 0) {
        reply.raw.write(
          `data: ${JSON.stringify({ type: "goals", goals: result.extractedGoals })}\n\n`
        );
      }

      if (result.suggestedAgentReconfigs.length > 0) {
        reply.raw.write(
          `data: ${JSON.stringify({ type: "reconfigs", reconfigs: result.suggestedAgentReconfigs })}\n\n`
        );
      }

      reply.raw.write(
        `data: ${JSON.stringify({ type: "done", modelUsed: result.modelUsed, tokensUsed: result.tokensUsed })}\n\n`
      );
    } catch (err) {
      reply.raw.write(
        `data: ${JSON.stringify({ type: "error", message: (err as Error).message })}\n\n`
      );
    }

    reply.raw.end();
  });
}

function chunkText(text: string, chunkSize: number): string[] {
  const words = text.split(" ");
  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += chunkSize) {
    chunks.push(words.slice(i, i + chunkSize).join(" "));
  }
  return chunks;
}
