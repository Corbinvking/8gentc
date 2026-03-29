import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { platformCClient } from "@8gent/api-client/platform-c";
import { db } from "@8gent/db";
import { chatMessages } from "@8gent/db/schema";

export const maxDuration = 60;

export async function POST(req: Request) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { message, noteContext, workspaceId } = await req.json();

  if (!message?.trim()) {
    return NextResponse.json({ error: "Message required" }, { status: 400 });
  }

  const threadId = crypto.randomUUID();

  await db.insert(chatMessages).values({
    id: crypto.randomUUID(),
    userId: user.id,
    workspaceId: workspaceId ?? "",
    threadId,
    role: "user",
    content: message,
    noteContextId: noteContext ?? null,
  });

  let engineStream: ReadableStream<Uint8Array>;
  try {
    engineStream = platformCClient.chat.sendMessage({
      message,
      userId: user.id,
      workspaceId: workspaceId ?? "",
      noteContextId: noteContext,
    });
  } catch {
    return new Response("Platform C engine is currently unavailable. Please try again shortly.", {
      status: 503,
      headers: { "Content-Type": "text/plain" },
    });
  }

  const assistantMsgId = crypto.randomUUID();
  let fullResponse = "";

  const wrappedStream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = engineStream.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          fullResponse += new TextDecoder().decode(value, { stream: true });
          controller.enqueue(value);
        }
      } catch {
        const fallback = new TextEncoder().encode(
          "\n\n[Connection interrupted. Your message was saved.]"
        );
        controller.enqueue(fallback);
      } finally {
        if (fullResponse.trim()) {
          db.insert(chatMessages)
            .values({
              id: assistantMsgId,
              userId: user.id,
              workspaceId: workspaceId ?? "",
              threadId,
              role: "assistant",
              content: fullResponse,
              noteContextId: noteContext ?? null,
            })
            .catch(() => {});
        }
        controller.close();
      }
    },
  });

  return new Response(wrappedStream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

export async function GET(req: Request) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const wsId = url.searchParams.get("workspaceId");

  const { eq, desc } = await import("drizzle-orm");

  const messages = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.userId, user.id))
    .orderBy(desc(chatMessages.createdAt))
    .limit(100);

  return NextResponse.json(messages);
}
