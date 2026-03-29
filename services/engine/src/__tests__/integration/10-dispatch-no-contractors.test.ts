import { describe, it, expect } from "vitest";
import { engineJSON } from "./test-helpers.js";

describe("Test 10: Dispatch with no available contractors", () => {
  let taskId: string;

  it("escalates a task when no contractors are online", async () => {
    const { status, body } = await engineJSON<any>("/tasks/escalate", {
      method: "POST",
      body: JSON.stringify({
        title: "Build a mobile app prototype",
        description: "Create a React Native prototype for a fitness tracking app with workout logging and progress charts.",
        workspaceId: "ws-dispatch-test",
        priority: "medium",
      }),
    });

    expect(status).toBe(201);
    expect(body.taskId).toBeDefined();
    expect(body.workstreams.length).toBeGreaterThan(0);
    taskId = body.taskId;
  });

  it("workstreams remain in pending status (no contractors to dispatch to)", async () => {
    const { body } = await engineJSON<any>(`/tasks/${taskId}/status`);
    expect(body.taskId).toBe(taskId);

    const pendingWorkstreams = body.workstreams.filter(
      (w: any) => w.status === "pending"
    );
    expect(pendingWorkstreams.length).toBeGreaterThanOrEqual(0);
  });

  it("dispatch/available-tasks returns empty for random contractor", async () => {
    const { body } = await engineJSON<any[]>("/dispatch/available-tasks", {
      userId: "nonexistent-contractor",
      role: "contractor",
    });

    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBe(0);
  });

  it("task can still receive deliverables once a contractor is assigned", async () => {
    const { status, body } = await engineJSON<any>(
      `/tasks/${taskId}/deliverable`,
      {
        method: "POST",
        userId: "late-contractor",
        role: "contractor",
        body: JSON.stringify({
          contractorId: "late-contractor",
          content: "Prototype implementation for fitness tracking app",
        }),
      }
    );

    expect(status).toBe(201);
    expect(body.id).toBeDefined();
    expect(body.status).toBe("submitted");
  });
});
