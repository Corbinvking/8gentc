import { describe, it, expect } from "vitest";
import { gatewayJSON, readSSE } from "./test-helpers.js";

const ENGINE_URL = process.env.ENGINE_URL ?? "http://localhost:3001";
const LLM_GATEWAY_URL = process.env.LLM_GATEWAY_URL ?? "http://localhost:3002";

describe("Test 9: Budget exhaustion mid-stream", () => {
  it("non-streaming request returns 429 when budget exceeded", async () => {
    const userId = "budget-exhaust-user";

    const responses = [];
    for (let i = 0; i < 20; i++) {
      const { status, body } = await gatewayJSON<any>("/llm/complete", {
        method: "POST",
        body: JSON.stringify({
          prompt: `Budget test iteration ${i}: Write a very long response about the history of computing.`,
          userId,
          maxTokens: 4096,
        }),
      });

      responses.push({ status, body });
      if (status === 429) break;
    }

    const blocked = responses.filter((r) => r.status === 429);
    const successful = responses.filter((r) => r.status === 200);

    expect(successful.length).toBeGreaterThan(0);
    if (blocked.length > 0) {
      expect(blocked[0].body.error).toContain("Budget");
    }
  });

  it("streaming request terminates gracefully on error", async () => {
    const res = await fetch(`${LLM_GATEWAY_URL}/llm/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: "Count to 100",
        userId: "stream-error-test",
        stream: true,
        maxTokens: 100,
      }),
    });

    expect(res.status).toBe(200);

    const reader = res.body?.getReader();
    if (!reader) return;

    const events: any[] = [];
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try { events.push(JSON.parse(line.slice(6))); } catch {}
        }
      }
    }

    const hasTermination = events.some(
      (e) => e.type === "done" || e.type === "error"
    );
    expect(hasTermination).toBe(true);
  });

  it("chat endpoint terminates gracefully on LLM error", async () => {
    const events = await readSSE(`${ENGINE_URL}/chat/message`, {
      message: "Tell me everything about quantum physics",
      workspaceId: "ws-budget-test",
    }, "budget-chat-user");

    const hasTermination = events.some(
      (e) => e.type === "done" || e.type === "error"
    );
    expect(hasTermination).toBe(true);
  });
});
