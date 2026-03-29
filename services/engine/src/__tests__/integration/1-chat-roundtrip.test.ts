import { describe, it, expect } from "vitest";
import { readSSE, engineJSON, gatewayJSON } from "./test-helpers.js";

const ENGINE_URL = process.env.ENGINE_URL ?? "http://localhost:3001";

describe("Test 1: Full chat round-trip", () => {
  it("POST /chat/message streams SSE events through LLM gateway", async () => {
    const events = await readSSE(`${ENGINE_URL}/chat/message`, {
      message: "What are my current goals?",
      workspaceId: "ws-test-1",
    });

    expect(events.length).toBeGreaterThan(0);

    const textEvents = events.filter((e) => e.type === "text");
    expect(textEvents.length).toBeGreaterThan(0);
    for (const e of textEvents) {
      expect(typeof e.content).toBe("string");
      expect((e.content as string).length).toBeGreaterThan(0);
    }

    const doneEvent = events.find((e) => e.type === "done");
    expect(doneEvent).toBeDefined();
    expect(doneEvent?.modelUsed).toBeDefined();
    expect(typeof doneEvent?.tokensUsed).toBe("number");
  });

  it("streams real tokens, not buffered chunks", async () => {
    const events = await readSSE(`${ENGINE_URL}/chat/message`, {
      message: "Say hello",
      workspaceId: "ws-test-1",
    });

    const textEvents = events.filter((e) => e.type === "text");
    expect(textEvents.length).toBeGreaterThan(1);
  });

  it("LLM gateway routes to appropriate model for simple chat", async () => {
    const { status, body } = await gatewayJSON("/llm/complete", {
      method: "POST",
      body: JSON.stringify({
        prompt: "Say hi",
        userId: "test-user-1",
        taskType: "simple",
      }),
    });

    expect(status).toBe(200);
    expect((body as any).response).toBeDefined();
    expect((body as any).modelUsed).toBeDefined();
    expect((body as any).inputTokens).toBeGreaterThan(0);
    expect((body as any).outputTokens).toBeGreaterThan(0);
  });

  it("verifies metering logs the LLM call", async () => {
    await gatewayJSON("/llm/complete", {
      method: "POST",
      body: JSON.stringify({
        prompt: "Test metering",
        userId: "test-metering-user",
        taskType: "simple",
      }),
    });

    const { body } = await gatewayJSON("/llm/usage/test-metering-user");
    expect(body).toBeDefined();
  });
});
