import { describe, it, expect } from "vitest";
import { engineJSON } from "./test-helpers.js";

describe("Test 4: Telemetry → Scoring → Billing pipeline", () => {
  const contractorId = "test-contractor-pipeline";
  const userId = "test-user-billing";

  it("ingests individual telemetry events via POST /telemetry/prompt", async () => {
    const results = [];
    for (let i = 0; i < 10; i++) {
      const { status, body } = await engineJSON<any>("/telemetry/prompt", {
        method: "POST",
        body: JSON.stringify({
          userId,
          contractorId,
          taskId: "task-t1",
          payload: {
            model: "claude-sonnet-4-20250514",
            tokensIn: 500 + i * 10,
            tokensOut: 200 + i * 5,
            latencyMs: 150 + i * 3,
            cost: 0.001 * (i + 1),
          },
        }),
      });

      expect(status).toBe(201);
      expect(body.id).toBeDefined();
      results.push(body.id);
    }

    expect(results.length).toBe(10);
  });

  it("ingests additional events via POST /telemetry/session", async () => {
    const types = [
      "task.completed",
      "task.completed",
      "task.completed",
      "deliverable.submitted",
      "deliverable.accepted",
    ];

    for (const type of types) {
      const { status } = await engineJSON("/telemetry/session", {
        method: "POST",
        body: JSON.stringify({
          type,
          userId,
          contractorId,
          taskId: "task-t1",
          payload: { quality: "good", onTime: true },
        }),
      });

      expect(status).toBe(201);
    }
  });

  it("ingests batch telemetry events", async () => {
    const events = Array.from({ length: 5 }, (_, i) => ({
      type: "llm.call" as const,
      userId,
      contractorId,
      payload: {
        model: "gpt-4o-mini",
        tokensIn: 100 + i * 20,
        tokensOut: 50 + i * 10,
        latencyMs: 80,
        cost: 0.0001 * (i + 1),
      },
    }));

    const { status, body } = await engineJSON<any>("/telemetry/batch", {
      method: "POST",
      body: JSON.stringify({ events }),
    });

    expect(status).toBe(201);
    expect(body.ids).toBeDefined();
    expect(body.ids.length).toBe(5);
  });

  it("retrieves contractor scoring from telemetry", async () => {
    const { body } = await engineJSON<any>(
      `/telemetry/scores/${contractorId}`
    );

    expect(body).toBeDefined();
    expect(typeof body.composite).toBe("number");
  });

  it("retrieves quality benchmarks", async () => {
    const { body } = await engineJSON<any>("/telemetry/benchmarks/development");

    expect(body).toBeDefined();
    expect(body.taskType).toBe("development");
    expect(body.benchmarks).toBeDefined();
  });
});
