import { requireUser } from "@/lib/auth";
import { platformCClient } from "@8gent/api-client/platform-c";
import { db } from "@8gent/db";
import { chatMessages } from "@8gent/db/schema";

export async function POST(req: Request) {
  const user = await requireUser();
  const { message, noteContext, workspaceId } = await req.json();

  await db.insert(chatMessages).values({
    id: crypto.randomUUID(),
    userId: user.id,
    workspaceId: workspaceId ?? "",
    role: "user",
    content: message,
    noteContextId: noteContext ?? null,
  });

  const stream = platformCClient.chat.sendMessage({
    message,
    userId: user.id,
    workspaceId: workspaceId ?? "",
    noteContextId: noteContext,
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
