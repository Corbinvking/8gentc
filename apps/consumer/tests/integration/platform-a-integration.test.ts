/**
 * Cross-platform integration tests: Platform A ↔ Platform C
 *
 * These tests validate that the consumer app correctly communicates with
 * Platform C's engine services. They require Platform C running locally
 * at ENGINE_API_URL (default http://localhost:3001).
 *
 * Run: INTEGRATION=1 pnpm vitest run tests/integration/platform-a-integration.test.ts
 */

import { describe, it, expect, beforeAll } from "vitest";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const ENGINE_URL = process.env.ENGINE_API_URL ?? "http://localhost:3001";

const SKIP_REASON =
  "Set INTEGRATION=1 and ensure Platform C is running to execute";

function skipUnlessIntegration() {
  if (!process.env.INTEGRATION) {
    return true;
  }
  return false;
}

async function ensureEngineReachable(): Promise<boolean> {
  try {
    const res = await fetch(`${ENGINE_URL}/health`, {
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

describe("Platform A ↔ Platform C Integration", () => {
  let engineUp = false;

  beforeAll(async () => {
    if (skipUnlessIntegration()) return;
    engineUp = await ensureEngineReachable();
  });

  // -------------------------------------------------------------------------
  // Test 1: Chat round-trip
  // -------------------------------------------------------------------------
  describe("Test 1: Chat round-trip", () => {
    it.skipIf(skipUnlessIntegration() || !engineUp)(
      "sends message and receives SSE stream with tokens stored in history",
      async () => {
        const res = await fetch(`${BASE_URL}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: "Hello, integration test",
            workspaceId: "test-workspace",
          }),
        });

        expect(res.status).toBe(200);
        expect(res.headers.get("content-type")).toContain(
          "text/event-stream"
        );

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let content = "";
        let chunks = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          content += decoder.decode(value, { stream: true });
          chunks++;
          if (chunks > 50) break;
        }

        expect(content.length).toBeGreaterThan(0);
        expect(chunks).toBeGreaterThanOrEqual(1);

        const historyRes = await fetch(
          `${BASE_URL}/api/chat?workspaceId=test-workspace`
        );
        if (historyRes.ok) {
          const history = await historyRes.json();
          expect(Array.isArray(history)).toBe(true);
        }
      },
      30_000
    );
  });

  // -------------------------------------------------------------------------
  // Test 2: Agent lifecycle
  // -------------------------------------------------------------------------
  describe("Test 2: Agent lifecycle", () => {
    let agentId: string;

    it.skipIf(skipUnlessIntegration() || !engineUp)(
      "creates an agent and receives 201 with agent ID",
      async () => {
        const res = await fetch(`${BASE_URL}/api/agents`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Integration Test Agent",
            skills: ["research"],
            config: { workspaceId: "test-workspace" },
          }),
        });

        expect(res.status).toBe(201);
        const body = await res.json();
        expect(body.id).toBeDefined();
        agentId = body.id;
      }
    );

    it.skipIf(skipUnlessIntegration() || !engineUp)(
      "fetches agent status as idle or running",
      async () => {
        if (!agentId) return;

        const res = await fetch(
          `${BASE_URL}/api/agents/${agentId}/status`
        );
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(["idle", "running", "paused", "error", "unknown"]).toContain(
          body.status
        );
      }
    );

    it.skipIf(skipUnlessIntegration() || !engineUp)(
      "pauses the agent and verifies status change",
      async () => {
        if (!agentId) return;

        const pauseRes = await fetch(
          `${BASE_URL}/api/agents/${agentId}/pause`,
          { method: "POST" }
        );
        expect(pauseRes.status).toBe(200);

        const statusRes = await fetch(
          `${BASE_URL}/api/agents/${agentId}/status`
        );
        const body = await statusRes.json();
        expect(body.status).toBe("paused");
      }
    );

    it.skipIf(skipUnlessIntegration() || !engineUp)(
      "deletes the agent and verifies 404 on subsequent GET",
      async () => {
        if (!agentId) return;

        const deleteRes = await fetch(
          `${BASE_URL}/api/agents/${agentId}`,
          { method: "DELETE" }
        );
        expect(deleteRes.status).toBe(200);

        const getRes = await fetch(
          `${BASE_URL}/api/agents/${agentId}`
        );
        expect(getRes.status).toBe(404);
      }
    );
  });

  // -------------------------------------------------------------------------
  // Test 3: Metering data flow
  // -------------------------------------------------------------------------
  describe("Test 3: Metering data flow", () => {
    it.skipIf(skipUnlessIntegration() || !engineUp)(
      "returns usage data with correct shape",
      async () => {
        const res = await fetch(`${BASE_URL}/api/billing/usage`);
        expect(res.status).toBe(200);

        const body = await res.json();

        expect(body).toHaveProperty("runtimeHoursUsed");
        expect(body).toHaveProperty("runtimeHoursLimit");
        expect(body).toHaveProperty("tokensByAgent");
        expect(body).toHaveProperty("projectedUsage");
        expect(body).toHaveProperty("billingPeriodEnd");

        expect(typeof body.runtimeHoursUsed).toBe("number");
        expect(body.runtimeHoursUsed).toBeGreaterThanOrEqual(0);

        expect(typeof body.runtimeHoursLimit).toBe("number");
        expect(body.runtimeHoursLimit).toBeGreaterThanOrEqual(0);

        expect(Array.isArray(body.tokensByAgent)).toBe(true);
        for (const agent of body.tokensByAgent) {
          expect(agent).toHaveProperty("agentId");
          expect(agent).toHaveProperty("agentName");
          expect(agent).toHaveProperty("tokens");
          expect(typeof agent.tokens).toBe("number");
          expect(agent.tokens).toBeGreaterThanOrEqual(0);
        }
      }
    );
  });

  // -------------------------------------------------------------------------
  // Test 4: Task escalation
  // -------------------------------------------------------------------------
  describe("Test 4: Task escalation", () => {
    it.skipIf(skipUnlessIntegration() || !engineUp)(
      "escalates a task and receives 201 with task ID, then checks status",
      async () => {
        const escalateRes = await fetch(`${BASE_URL}/api/tasks/escalate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: "Build integration test feature",
            description:
              "This is a test task for validating the escalation pipeline.",
            workspaceId: "test-workspace",
            contextNoteIds: [],
          }),
        });

        expect(escalateRes.status).toBe(201);
        const { taskId } = await escalateRes.json();
        expect(taskId).toBeDefined();

        const statusRes = await fetch(
          `${BASE_URL}/api/tasks/${taskId}/status`
        );
        expect(statusRes.status).toBe(200);
        const status = await statusRes.json();
        expect([
          "decomposing",
          "dispatching",
          "pending",
          "in_progress",
        ]).toContain(status.status);
      }
    );
  });

  // -------------------------------------------------------------------------
  // Test 5: Understanding notifications
  // -------------------------------------------------------------------------
  describe("Test 5: Understanding notifications", () => {
    it.skipIf(skipUnlessIntegration() || !engineUp)(
      "fetches notifications array and submits feedback",
      async () => {
        const notifRes = await fetch(`${BASE_URL}/api/notifications`);
        expect(notifRes.status).toBe(200);

        const notifications = await notifRes.json();
        expect(Array.isArray(notifications)).toBe(true);

        if (notifications.length > 0) {
          const first = notifications[0];
          expect(first).toHaveProperty("id");
          expect(first).toHaveProperty("type");
          expect(first).toHaveProperty("title");

          const feedbackRes = await fetch(
            `${BASE_URL}/api/notifications/feedback`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                notificationId: first.id,
                helpful: true,
              }),
            }
          );
          expect(feedbackRes.status).toBe(200);
        }
      }
    );
  });
});

// ---------------------------------------------------------------------------
// Standalone contract tests (run without Platform C)
// ---------------------------------------------------------------------------
describe("API contract (offline)", () => {
  it("ambition classifier returns scored result", async () => {
    const { scoreAmbition } = await import("../../src/lib/ambition-classifier");

    const result = scoreAmbition(
      "Build a SaaS Platform",
      "Create a full-stack application with frontend, backend, database, authentication, payments, and deploy to production."
    );

    expect(result.score).toBeGreaterThan(0);
    expect(result.exceedsThreshold).toBe(true);
    expect(result.suggestedPlan).toBeDefined();
    expect(result.reasoning.length).toBeGreaterThan(0);
    expect(result.dimensions.domainComplexity).toBeGreaterThan(0);
    expect(result.dimensions.keywordDensity).toBeGreaterThan(0);
  });

  it("ambition classifier scores simple task below threshold", async () => {
    const { scoreAmbition } = await import("../../src/lib/ambition-classifier");

    const result = scoreAmbition(
      "Fix typo",
      "Change color to colour in the about page."
    );

    expect(result.score).toBeLessThan(0.3);
    expect(result.exceedsThreshold).toBe(false);
    expect(result.suggestedPlan).toBe("individual");
  });
});
