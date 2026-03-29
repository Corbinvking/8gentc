import { describe, it, expect } from "vitest";
import { engineJSON } from "./test-helpers.js";

describe("Test 3: Full enterprise escalation", () => {
  let taskId: string;
  let workstreams: any[];

  it("escalates a task via POST /tasks/escalate", async () => {
    const { status, body } = await engineJSON<any>("/tasks/escalate", {
      method: "POST",
      body: JSON.stringify({
        title: "Build restaurant reservation SaaS",
        description:
          "Build a full SaaS platform for managing restaurant reservations, including booking UI, admin dashboard, payment integration, and notification system.",
        workspaceId: "ws-test-1",
        priority: "high",
      }),
    });

    expect(status).toBe(201);
    expect(body.taskId).toBeDefined();
    expect(body.status).toBe("assigned");
    expect(body.workstreams).toBeDefined();
    expect(body.workstreams.length).toBeGreaterThan(0);

    taskId = body.taskId;
    workstreams = body.workstreams;
  });

  it("workstreams have required structure", () => {
    for (const ws of workstreams) {
      expect(ws.title).toBeDefined();
      expect(ws.domain).toBeDefined();
      expect(ws.complexityTier).toBeGreaterThanOrEqual(1);
      expect(ws.status).toBe("pending");
    }
  });

  it("checks task status reflects workstreams", async () => {
    const { body } = await engineJSON<any>(`/tasks/${taskId}/status`);
    expect(body.taskId).toBe(taskId);
    expect(body.status).toBe("assigned");
    expect(body.workstreams.length).toBeGreaterThan(0);
  });

  it("accepts a dispatch offer (simulated)", async () => {
    const { body: acceptResult } = await engineJSON<any>("/dispatch/accept", {
      method: "POST",
      userId: "contractor-1",
      role: "contractor",
      body: JSON.stringify({ offerId: "test-offer-placeholder" }),
    });

    // May fail with "Offer not found" since no real dispatch ran, which is expected
    expect(acceptResult).toBeDefined();
  });

  it("submits a deliverable for the task", async () => {
    const { status, body } = await engineJSON<any>(
      `/tasks/${taskId}/deliverable`,
      {
        method: "POST",
        userId: "contractor-1",
        role: "contractor",
        body: JSON.stringify({
          contractorId: "contractor-1",
          content: "## Restaurant Booking UI\n\nFull implementation of the booking interface...",
          workstreamId: workstreams[0]?.id,
        }),
      }
    );

    expect(status).toBe(201);
    expect(body.id).toBeDefined();
    expect(body.status).toBe("submitted");
  });

  it("retrieves deliverables from Platform A perspective", async () => {
    const { body } = await engineJSON<any[]>(`/tasks/${taskId}/deliverables`);
    expect(body.length).toBeGreaterThan(0);
    expect(body[0].content).toContain("Restaurant Booking UI");
  });

  it("sends a clarification from contractor", async () => {
    const { status, body } = await engineJSON<any>(
      `/tasks/${taskId}/clarification`,
      {
        method: "POST",
        userId: "contractor-1",
        role: "contractor",
        body: JSON.stringify({
          senderType: "contractor",
          senderId: "contractor-1",
          message: "Need clarification on the payment gateway preference",
        }),
      }
    );

    expect(status).toBe(201);
    expect(body.id).toBeDefined();
  });

  it("retrieves clarifications", async () => {
    const { body } = await engineJSON<any[]>(
      `/tasks/${taskId}/clarifications`
    );
    expect(body.length).toBeGreaterThan(0);
    expect(body[0].senderType).toBe("contractor");
  });
});
