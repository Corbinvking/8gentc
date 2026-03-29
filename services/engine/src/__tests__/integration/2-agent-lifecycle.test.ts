import { describe, it, expect } from "vitest";
import { engineJSON, sleep } from "./test-helpers.js";

describe("Test 2: Agent lifecycle with real execution", () => {
  let agentId: string;

  it("creates an agent with skills", async () => {
    const { status, body } = await engineJSON<any>("/agents", {
      method: "POST",
      body: JSON.stringify({
        name: "Test Agent",
        skills: ["summarize", "web-search"],
        config: { heartbeatIntervalMs: 5000 },
      }),
    });

    expect(status).toBe(201);
    expect(body.id).toBeDefined();
    expect(body.name).toBe("Test Agent");
    expect(body.status).toBe("idle");
    expect(body.skills).toContain("summarize");
    agentId = body.id;
  });

  it("starts the agent (resume)", async () => {
    const { body } = await engineJSON<any>(`/agents/${agentId}/resume`, {
      method: "POST",
    });
    expect(body.status).toBe("running");
  });

  it("verifies agent status is running", async () => {
    const { body } = await engineJSON<any>(`/agents/${agentId}/status`);
    expect(body.status).toBe("running");
  });

  it("pauses the agent", async () => {
    const { body } = await engineJSON<any>(`/agents/${agentId}/pause`, {
      method: "POST",
    });
    expect(body.status).toBe("paused");
  });

  it("resumes the agent again", async () => {
    const { body } = await engineJSON<any>(`/agents/${agentId}/resume`, {
      method: "POST",
    });
    expect(body.status).toBe("running");
  });

  it("retrieves agent outputs after heartbeat", async () => {
    await sleep(2000);

    const { body } = await engineJSON<any[]>(`/agents/${agentId}/outputs`);
    expect(Array.isArray(body)).toBe(true);
  });

  it("lists all user agents", async () => {
    const { body } = await engineJSON<any[]>("/agents");
    expect(Array.isArray(body)).toBe(true);
    const found = body.find((a: any) => a.id === agentId);
    expect(found).toBeDefined();
  });

  it("deletes the agent", async () => {
    const { status } = await engineJSON(`/agents/${agentId}`, {
      method: "DELETE",
    });
    expect(status).toBe(204);
  });

  it("confirms agent is deleted", async () => {
    const { status } = await engineJSON(`/agents/${agentId}/status`);
    expect(status).toBe(404);
  });
});
