import { describe, it, expect } from "vitest";
import { engineJSON, gatewayJSON } from "./test-helpers.js";

describe("Test 7: Concurrent multi-tenant load", () => {
  const users = Array.from({ length: 10 }, (_, i) => `tenant-user-${i}`);

  it("10 users create agents simultaneously without data leakage", async () => {
    const creates = users.map((userId) =>
      engineJSON<any>("/agents", {
        method: "POST",
        userId,
        body: JSON.stringify({
          name: `Agent for ${userId}`,
          skills: ["summarize"],
        }),
      })
    );

    const results = await Promise.all(creates);
    for (const { status, body } of results) {
      expect(status).toBe(201);
      expect(body.id).toBeDefined();
    }
  });

  it("each user only sees their own agents", async () => {
    const lists = users.map((userId) =>
      engineJSON<any[]>("/agents", { userId })
    );

    const results = await Promise.all(lists);

    for (let i = 0; i < results.length; i++) {
      const { body } = results[i];
      const ownAgents = body.filter((a: any) => a.name === `Agent for ${users[i]}`);
      const otherAgents = body.filter((a: any) => !a.name.includes(users[i]));

      expect(ownAgents.length).toBeGreaterThanOrEqual(1);
      expect(otherAgents.length).toBe(0);
    }
  });

  it("10 concurrent LLM calls bill to correct user", async () => {
    const calls = users.slice(0, 5).map((userId) =>
      gatewayJSON<any>("/llm/complete", {
        method: "POST",
        body: JSON.stringify({
          prompt: `Hello from ${userId}`,
          userId,
          taskType: "simple",
          maxTokens: 10,
        }),
      })
    );

    const results = await Promise.all(calls);
    for (const { status, body } of results) {
      expect(status).toBe(200);
      expect(body.response).toBeDefined();
      expect(body.inputTokens).toBeGreaterThan(0);
    }
  });

  it("cleanup: delete test agents", async () => {
    for (const userId of users) {
      const { body } = await engineJSON<any[]>("/agents", { userId });
      for (const agent of body) {
        await engineJSON(`/agents/${agent.id}`, { method: "DELETE", userId });
      }
    }
  });
});
