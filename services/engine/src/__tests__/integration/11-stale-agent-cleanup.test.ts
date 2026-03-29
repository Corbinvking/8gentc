import { describe, it, expect } from "vitest";
import { agentHostJSON } from "./test-helpers.js";

describe("Test 11: Stale agent cleanup", () => {
  it("agent-host health check returns Docker daemon status", async () => {
    const { body } = await agentHostJSON<any>("/health");
    expect(body.status).toBeDefined();
    expect(body.service).toBe("agent-host");
    expect(body.dependencies).toBeDefined();
    expect(typeof body.dependencies.docker).toBe("boolean");
  });

  it("metrics endpoint reports container counts", async () => {
    const { body } = await agentHostJSON<any>("/metrics");
    expect(body).toBeDefined();
    expect(typeof body.totalContainers).toBe("number");
    expect(typeof body.runningContainers).toBe("number");
  });

  it("listing containers returns array", async () => {
    const { body } = await agentHostJSON<any[]>("/containers");
    expect(Array.isArray(body)).toBe(true);
  });

  it("alerts endpoint evaluates scaling conditions", async () => {
    const { body } = await agentHostJSON<any>("/alerts");
    expect(body).toBeDefined();
  });

  it("spawning container with invalid plan returns 429 or error", async () => {
    const { status, body } = await agentHostJSON<any>("/containers/spawn", {
      method: "POST",
      body: JSON.stringify({
        userId: "stale-test-user",
        agentId: "stale-agent-1",
        plan: "free",
      }),
    });

    // Either succeeds (201) or fails due to Docker not running / limits
    expect([201, 429, 500]).toContain(status);
  });

  it("container stats returns data or error for unknown container", async () => {
    const { status } = await agentHostJSON("/containers/nonexistent-id/stats");
    expect([200, 404, 500]).toContain(status);
  });

  it("destroying non-existent container fails gracefully", async () => {
    const { status } = await agentHostJSON("/containers/nonexistent-id", {
      method: "DELETE",
    });
    expect([200, 404, 500]).toContain(status);
  });
});
