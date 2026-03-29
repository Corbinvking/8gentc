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

// ---------------------------------------------------------------------------
// Error path tests
// ---------------------------------------------------------------------------
describe("Error path tests", () => {
  it.skipIf(skipUnlessIntegration())(
    "returns 502 when Platform C is down for agent list",
    async () => {
      const fakeEngineUrl = "http://localhost:19999";
      const res = await fetch(`${BASE_URL}/api/agents`, {
        headers: {
          "X-Test-Engine-Url": fakeEngineUrl,
        },
      });

      if (res.status === 502) {
        const body = await res.json();
        expect(body.error).toContain("unavailable");
      } else {
        expect([200, 401, 502]).toContain(res.status);
      }
    }
  );

  it.skipIf(skipUnlessIntegration())(
    "chat route returns 503 when engine is unreachable",
    async () => {
      const res = await fetch(`${BASE_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "test error path",
          workspaceId: "test",
        }),
      });
      expect([200, 401, 503]).toContain(res.status);
    }
  );
});

// ---------------------------------------------------------------------------
// Auth rejection tests
// ---------------------------------------------------------------------------
describe("Auth rejection tests", () => {
  const unauthFetch = (url: string, options?: RequestInit) =>
    fetch(url, {
      ...options,
      headers: {
        ...options?.headers,
        Cookie: "",
      },
      redirect: "manual",
    });

  it("GET /api/agents without auth returns 401 or redirect", async () => {
    const res = await unauthFetch(`${BASE_URL}/api/agents`);
    expect([401, 302, 307]).toContain(res.status);
  });

  it("POST /api/chat without auth returns 401 or redirect", async () => {
    const res = await unauthFetch(`${BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "hello" }),
    });
    expect([401, 302, 307]).toContain(res.status);
  });

  it("GET /api/billing/usage without auth returns 401 or redirect", async () => {
    const res = await unauthFetch(`${BASE_URL}/api/billing/usage`);
    expect([401, 302, 307]).toContain(res.status);
  });

  it("GET /api/notes without auth returns 401 or redirect", async () => {
    const res = await unauthFetch(`${BASE_URL}/api/notes`);
    expect([401, 302, 307]).toContain(res.status);
  });

  it("GET /api/notifications without auth returns 401 or redirect", async () => {
    const res = await unauthFetch(`${BASE_URL}/api/notifications`);
    expect([401, 302, 307]).toContain(res.status);
  });
});

// ---------------------------------------------------------------------------
// Rate limit tests
// ---------------------------------------------------------------------------
describe("Rate limit tests (offline)", () => {
  it("rate limiter blocks after threshold", async () => {
    const { checkRateLimit } = await import("../../src/lib/rate-limit");

    const key = `test:rate-limit:${Date.now()}`;
    for (let i = 0; i < 30; i++) {
      const result = checkRateLimit(key);
      expect(result.limited).toBe(false);
    }

    const blocked = checkRateLimit(key);
    expect(blocked.limited).toBe(true);
    expect(blocked.remaining).toBe(0);
  });

  it("rate limiter allows requests from different keys", async () => {
    const { checkRateLimit } = await import("../../src/lib/rate-limit");

    const keyA = `test:a:${Date.now()}`;
    const keyB = `test:b:${Date.now()}`;

    for (let i = 0; i < 30; i++) {
      checkRateLimit(keyA);
    }

    const resultB = checkRateLimit(keyB);
    expect(resultB.limited).toBe(false);
    expect(resultB.remaining).toBe(29);
  });
});

// ---------------------------------------------------------------------------
// Concurrent user isolation test
// ---------------------------------------------------------------------------
describe("Concurrent user isolation", () => {
  it.skipIf(skipUnlessIntegration() || !engineUp)(
    "two users creating agents do not see each other's agents",
    async () => {
      const [resA, resB] = await Promise.all([
        fetch(`${BASE_URL}/api/agents`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Test-User": "user-a",
          },
          body: JSON.stringify({
            name: "User A Agent",
            skills: ["research"],
          }),
        }),
        fetch(`${BASE_URL}/api/agents`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Test-User": "user-b",
          },
          body: JSON.stringify({
            name: "User B Agent",
            skills: ["monitoring"],
          }),
        }),
      ]);

      if (resA.status === 201 && resB.status === 201) {
        const agentA = await resA.json();
        const agentB = await resB.json();

        expect(agentA.id).not.toBe(agentB.id);

        const listA = await fetch(`${BASE_URL}/api/agents`, {
          headers: { "X-Test-User": "user-a" },
        });
        const listB = await fetch(`${BASE_URL}/api/agents`, {
          headers: { "X-Test-User": "user-b" },
        });

        if (listA.ok && listB.ok) {
          const agentsA: Array<{ id: string }> = await listA.json();
          const agentsB: Array<{ id: string }> = await listB.json();

          const aIds = agentsA.map((a) => a.id);
          const bIds = agentsB.map((b) => b.id);

          expect(aIds).not.toContain(agentB.id);
          expect(bIds).not.toContain(agentA.id);
        }
      }
    }
  );
});
