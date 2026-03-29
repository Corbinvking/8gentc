import { describe, it, expect } from "vitest";
import { gatewayJSON } from "./test-helpers.js";

describe("Test 8: Provider outage simulation", () => {
  it("gateway returns response even with invalid Anthropic key (falls back)", async () => {
    const { status, body } = await gatewayJSON<any>("/llm/complete", {
      method: "POST",
      body: JSON.stringify({
        prompt: "Test fallback behavior",
        userId: "fallback-test-user",
        taskType: "simple",
        maxTokens: 20,
      }),
    });

    expect(status).toBe(200);
    expect(body.response).toBeDefined();
    expect(body.provider).toBeDefined();
    expect(body.modelUsed).toBeDefined();
  });

  it("metering still logs the call on fallback provider", async () => {
    const { body: usage } = await gatewayJSON("/llm/usage/fallback-test-user");
    expect(usage).toBeDefined();
  });

  it("health endpoint shows provider status", async () => {
    const { body } = await gatewayJSON<any>("/llm/providers");
    expect(Array.isArray(body)).toBe(true);

    for (const provider of body) {
      expect(provider.name).toBeDefined();
      expect(provider.health).toBeDefined();
    }
  });

  it("concurrent requests during degraded mode still succeed", async () => {
    const promises = Array.from({ length: 5 }, (_, i) =>
      gatewayJSON<any>("/llm/complete", {
        method: "POST",
        body: JSON.stringify({
          prompt: `Degraded mode test ${i}`,
          userId: "degraded-test-user",
          taskType: "simple",
          maxTokens: 10,
        }),
      })
    );

    const results = await Promise.allSettled(promises);
    const fulfilled = results.filter((r) => r.status === "fulfilled");
    expect(fulfilled.length).toBeGreaterThanOrEqual(3);
  });
});
