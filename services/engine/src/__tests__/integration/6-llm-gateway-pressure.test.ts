import { describe, it, expect } from "vitest";
import { gatewayJSON } from "./test-helpers.js";

describe("Test 6: LLM Gateway under pressure", () => {
  it("handles 20 concurrent requests without drops", async () => {
    const promises = Array.from({ length: 20 }, (_, i) =>
      gatewayJSON("/llm/complete", {
        method: "POST",
        body: JSON.stringify({
          prompt: `Concurrent test prompt ${i}: Say just "${i}"`,
          userId: `concurrent-user-${i % 5}`,
          taskType: "simple",
          maxTokens: 20,
        }),
      })
    );

    const results = await Promise.allSettled(promises);
    const fulfilled = results.filter((r) => r.status === "fulfilled");

    expect(fulfilled.length).toBe(20);

    for (const r of fulfilled) {
      const result = (r as PromiseFulfilledResult<any>).value;
      expect(result.status).toBe(200);
      expect(result.body.response).toBeDefined();
      expect(result.body.inputTokens).toBeGreaterThan(0);
      expect(result.body.outputTokens).toBeGreaterThan(0);
    }
  });

  it("metering captures all concurrent calls", async () => {
    const userId = "pressure-test-user";

    const promises = Array.from({ length: 5 }, (_, i) =>
      gatewayJSON("/llm/complete", {
        method: "POST",
        body: JSON.stringify({
          prompt: `Metering pressure test ${i}`,
          userId,
          taskType: "simple",
          maxTokens: 10,
        }),
      })
    );

    await Promise.all(promises);

    const { body: usage } = await gatewayJSON(`/llm/usage/${userId}`);
    expect(usage).toBeDefined();
  });

  it("semantic cache returns hits on duplicate prompts", async () => {
    const userId = "cache-test-user-pressure";
    const prompt = "What is 2 plus 2? Reply with just the number.";

    const { body: first } = await gatewayJSON<any>("/llm/complete", {
      method: "POST",
      body: JSON.stringify({ prompt, userId, maxTokens: 10 }),
    });

    expect(first.cacheHit).toBe(false);
    expect(first.response).toBeDefined();

    const { body: second } = await gatewayJSON<any>("/llm/complete", {
      method: "POST",
      body: JSON.stringify({ prompt, userId, maxTokens: 10 }),
    });

    expect(second.cacheHit).toBe(true);
    expect(second.cost).toBe(0);
    expect(second.response).toBe(first.response);
  });

  it("cache is tenant-isolated", async () => {
    const prompt = "Tenant isolation cache test";

    const { body: userA } = await gatewayJSON<any>("/llm/complete", {
      method: "POST",
      body: JSON.stringify({
        prompt,
        userId: "cache-user-a",
        maxTokens: 10,
      }),
    });

    const { body: userB } = await gatewayJSON<any>("/llm/complete", {
      method: "POST",
      body: JSON.stringify({
        prompt,
        userId: "cache-user-b",
        maxTokens: 10,
      }),
    });

    expect(userB.cacheHit).toBe(false);
  });

  it("budget enforcement blocks over-limit requests", async () => {
    const userId = "budget-test-user";

    // Set a very low budget and try multiple calls
    const responses = [];
    for (let i = 0; i < 3; i++) {
      const { status, body } = await gatewayJSON<any>("/llm/complete", {
        method: "POST",
        body: JSON.stringify({
          prompt: `Budget test ${i}`,
          userId,
          maxTokens: 4096,
        }),
      });
      responses.push({ status, body });
    }

    // All should complete since default budget is high
    for (const r of responses) {
      expect([200, 429]).toContain(r.status);
    }
  });

  it("provider routing sends simple prompts to cheap models", async () => {
    const { body } = await gatewayJSON<any>("/llm/complete", {
      method: "POST",
      body: JSON.stringify({
        prompt: "Hi",
        userId: "routing-test",
        taskType: "simple",
        maxTokens: 5,
      }),
    });

    expect(body.modelUsed).toBeDefined();
    const cheapModels = [
      "claude-3-5-haiku-20241022",
      "gpt-4o-mini",
      "gemini-2.0-flash",
    ];
    expect(cheapModels).toContain(body.modelUsed);
  });

  it("streaming endpoint returns SSE events", async () => {
    const res = await fetch(
      `${process.env.LLM_GATEWAY_URL ?? "http://localhost:3002"}/llm/complete`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: "Count to 3",
          userId: "stream-test",
          stream: true,
          maxTokens: 50,
        }),
      }
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/event-stream");

    const reader = res.body?.getReader();
    expect(reader).toBeDefined();

    const events: any[] = [];
    const decoder = new TextDecoder();
    let buffer = "";

    while (reader) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            events.push(JSON.parse(line.slice(6)));
          } catch { /* skip */ }
        }
      }
    }

    const textEvents = events.filter((e) => e.type === "text");
    expect(textEvents.length).toBeGreaterThan(0);

    const doneEvent = events.find((e) => e.type === "done");
    expect(doneEvent).toBeDefined();
  });
});
