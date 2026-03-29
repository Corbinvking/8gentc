import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function makeResponse(body: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  });
}

beforeEach(() => {
  mockFetch.mockReset();
});

describe("Cross-Platform Integration: Platform B <-> Platform C", () => {
  // -------------------------------------------------------------------------
  // Test 1: Receive task offer
  // -------------------------------------------------------------------------
  describe("Test 1: Receive task offer", () => {
    it("Platform C pushes a task offer and it lands in Platform B", async () => {
      const contractorId = "ctr-123";
      const taskOffer = {
        taskId: "task-456",
        title: "Build Login Page",
        description: "Create a responsive login form with OAuth2 support",
        complexity: 3,
        harnessType: "coding",
        category: "development",
        payoutMin: 40,
        payoutMax: 80,
        estimatedDuration: 90,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      };

      expect(taskOffer.title).toBeDefined();
      expect(taskOffer.description).toBeDefined();
      expect(taskOffer.complexity).toBeGreaterThanOrEqual(1);
      expect(taskOffer.complexity).toBeLessThanOrEqual(5);
      expect(taskOffer.payoutMin).toBeLessThanOrEqual(taskOffer.payoutMax);

      const { platformBClient } = await import("@8gent/api-client/platform-b");

      mockFetch.mockImplementationOnce(() =>
        makeResponse({ offerId: "offer-789" })
      );

      const result = await platformBClient.offerTask(contractorId, taskOffer as any);

      expect(result).toBeDefined();
      expect(result.offerId).toBe("offer-789");
      expect(mockFetch).toHaveBeenCalledOnce();

      const fetchCall = mockFetch.mock.calls[0];
      expect(fetchCall[0]).toContain("/api/contractors/offer");
      expect(fetchCall[1]?.method).toBe("POST");

      const sentBody = JSON.parse(fetchCall[1]?.body as string);
      expect(sentBody.title).toBe("Build Login Page");
      expect(sentBody.contractorId).toBe("ctr-123");
      expect(sentBody.taskId).toBe("task-456");
      expect(sentBody.complexity).toBe(3);
      expect(sentBody.payoutMin).toBe(40);
      expect(sentBody.payoutMax).toBe(80);
    });
  });

  // -------------------------------------------------------------------------
  // Test 2: Accept task -> access context
  // -------------------------------------------------------------------------
  describe("Test 2: Accept task -> access context", () => {
    it("accepts an offer then retrieves full task details and scoped context", async () => {
      const { platformCClient } = await import("@8gent/api-client/platform-c");

      mockFetch
        .mockImplementationOnce(() => makeResponse({ success: true }))
        .mockImplementationOnce(() =>
          makeResponse({
            id: "task-456",
            title: "Build Login Page",
            description: "Full details here",
            category: "development",
            complexity: 3,
            harnessType: "coding",
            estimatedDuration: 90,
            payoutMin: 40,
            payoutMax: 80,
            subtasks: [{ id: "sub-1", title: "Create form component" }],
            successCriteria: ["Form validates email", "OAuth2 flow works"],
          })
        )
        .mockImplementationOnce(() =>
          makeResponse({
            knowledgeGraphExcerpts: [
              { title: "Auth Design Doc", content: "OAuth2 flow specification..." },
            ],
            relevantDocuments: [
              { name: "Login Mockup", url: "https://figma.com/..." },
            ],
          })
        );

      const acceptResult = await platformCClient.acceptTask("task-456", "ctr-123");
      expect(acceptResult.success).toBe(true);

      const taskDetails = await platformCClient.getTaskDetails("task-456");
      expect(taskDetails.id).toBe("task-456");
      expect(taskDetails.title).toBe("Build Login Page");
      expect(taskDetails.category).toBe("development");

      const context = await platformCClient.getTaskContext("task-456");
      expect(context.knowledgeGraphExcerpts).toHaveLength(1);
      expect(context.knowledgeGraphExcerpts[0].title).toBe("Auth Design Doc");
      expect(context.relevantDocuments).toBeDefined();

      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });

  // -------------------------------------------------------------------------
  // Test 3: Telemetry capture
  // -------------------------------------------------------------------------
  describe("Test 3: Telemetry capture", () => {
    it("prompt, llm-call, and session events are sent to Platform C", async () => {
      const { platformCClient } = await import("@8gent/api-client/platform-c");

      mockFetch
        .mockImplementationOnce(() => makeResponse({ id: "session-1" }))
        .mockImplementationOnce(() => makeResponse({ id: "prompt-1" }))
        .mockImplementationOnce(() => makeResponse({ id: "llm-1" }))
        .mockImplementationOnce(() => makeResponse({ id: "session-end" }));

      const sessionResult = await platformCClient.logSession({
        contractorId: "ctr-123",
        taskId: "task-456",
        event: "start",
        timestamp: new Date(),
      });
      expect(sessionResult.id).toBe("session-1");

      const promptResult = await platformCClient.logPrompt({
        contractorId: "ctr-123",
        taskId: "task-456",
        harnessType: "coding",
        promptText: "Create a login form with email validation",
        tokenCount: 10,
        timestamp: new Date(),
      });
      expect(promptResult.id).toBe("prompt-1");

      const llmResult = await platformCClient.logLlmCall({
        contractorId: "ctr-123",
        taskId: "task-456",
        model: "claude-3.5-sonnet",
        inputTokens: 42,
        outputTokens: 350,
        latencyMs: 1200,
        cost: 0.003,
        timestamp: new Date(),
      });
      expect(llmResult.id).toBe("llm-1");

      const endResult = await platformCClient.logSession({
        contractorId: "ctr-123",
        taskId: "task-456",
        event: "submit",
        timestamp: new Date(),
      });
      expect(endResult.id).toBe("session-end");

      expect(mockFetch).toHaveBeenCalledTimes(4);

      const [sessionCall, promptCall, llmCall, submitCall] = mockFetch.mock.calls;
      expect(sessionCall[0]).toContain("/telemetry/session");
      expect(promptCall[0]).toContain("/telemetry/prompt");
      expect(llmCall[0]).toContain("/telemetry/llm-call");
      expect(submitCall[0]).toContain("/telemetry/session");

      const promptBody = JSON.parse(promptCall[1]?.body as string);
      expect(promptBody.promptText).toBe("Create a login form with email validation");
      expect(promptBody.tokenCount).toBe(10);

      const llmBody = JSON.parse(llmCall[1]?.body as string);
      expect(llmBody.inputTokens).toBe(42);
      expect(llmBody.outputTokens).toBe(350);
      expect(llmBody.model).toBe("claude-3.5-sonnet");
    });
  });

  // -------------------------------------------------------------------------
  // Test 4: Deliverable submission
  // -------------------------------------------------------------------------
  describe("Test 4: Deliverable submission", () => {
    it("submits deliverable to Platform C and it can be retrieved", async () => {
      const { platformCClient } = await import("@8gent/api-client/platform-c");

      const deliverableContent = `
export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  return <form>...</form>;
}`;

      mockFetch
        .mockImplementationOnce(() =>
          makeResponse({
            id: "del-001",
            taskId: "task-456",
            contractorId: "ctr-123",
            content: deliverableContent,
            status: "submitted",
            createdAt: new Date().toISOString(),
          })
        )
        .mockImplementationOnce(() =>
          makeResponse([
            {
              id: "del-001",
              taskId: "task-456",
              title: "Login Form Implementation",
              description: "Deliverable submitted",
              status: "pending_review",
              createdAt: new Date().toISOString(),
            },
          ])
        );

      const submitResult = await platformCClient.submitDeliverable("task-456", {
        contractorId: "ctr-123",
        content: deliverableContent,
        fileUrls: [],
      });

      expect(submitResult.id).toBe("del-001");
      expect(submitResult.taskId).toBe("task-456");

      const deliverables = await platformCClient.tasks.getDeliverables("task-456");
      expect(deliverables).toHaveLength(1);
      expect(deliverables[0].taskId).toBe("task-456");
      expect(deliverables[0].status).toBe("pending_review");

      const submitCall = mockFetch.mock.calls[0];
      expect(submitCall[0]).toContain("/tasks/task-456/deliverable");
      expect(submitCall[1]?.method).toBe("POST");
    });
  });

  // -------------------------------------------------------------------------
  // Test 5: Scoring round-trip
  // -------------------------------------------------------------------------
  describe("Test 5: Scoring round-trip", () => {
    it("retrieves scores from Platform C after task completion", async () => {
      const { platformCClient } = await import("@8gent/api-client/platform-c");

      const mockScores = [
        {
          taskId: "task-456",
          contractorId: "ctr-123",
          composite: 82,
          tokenEfficiency: 85,
          promptQuality: 78,
          outputQuality: 88,
          speed: 77,
          calculatedAt: new Date().toISOString(),
        },
      ];

      mockFetch.mockImplementationOnce(() => makeResponse(mockScores));

      const scores = await platformCClient.getContractorScores("ctr-123");

      expect(scores).toHaveLength(1);
      expect(scores[0].composite).toBe(82);
      expect(scores[0].composite).toBeGreaterThanOrEqual(0);
      expect(scores[0].composite).toBeLessThanOrEqual(100);
      expect(scores[0].tokenEfficiency).toBe(85);
      expect(scores[0].promptQuality).toBe(78);
      expect(scores[0].outputQuality).toBe(88);
      expect(scores[0].speed).toBe(77);

      const fetchCall = mockFetch.mock.calls[0];
      expect(fetchCall[0]).toContain("/telemetry/scores/ctr-123");
    });
  });

  // -------------------------------------------------------------------------
  // Test 6: Availability query
  // -------------------------------------------------------------------------
  describe("Test 6: Availability query", () => {
    it("online contractor appears in available list, offline disappears", async () => {
      const { platformBClient } = await import("@8gent/api-client/platform-b");

      mockFetch.mockImplementationOnce(() =>
        makeResponse([
          {
            id: "ctr-123",
            displayName: "Jane Dev",
            skills: ["coding"],
            tier: "tier_1",
            compositeScore: 82,
            currentTaskCount: 1,
            isOnline: true,
          },
          {
            id: "ctr-456",
            displayName: "John Writer",
            skills: ["content"],
            tier: "tier_2",
            compositeScore: 75,
            currentTaskCount: 0,
            isOnline: true,
          },
        ])
      );

      const onlineContractors = await platformBClient.getAvailableContractors();
      expect(onlineContractors).toHaveLength(2);
      expect(onlineContractors.find((c: any) => c.id === "ctr-123")).toBeDefined();

      mockFetch.mockImplementationOnce(() =>
        makeResponse([
          {
            id: "ctr-456",
            displayName: "John Writer",
            skills: ["content"],
            tier: "tier_2",
            compositeScore: 75,
            currentTaskCount: 0,
            isOnline: true,
          },
        ])
      );

      const afterOffline = await platformBClient.getAvailableContractors();
      expect(afterOffline).toHaveLength(1);
      expect(afterOffline.find((c: any) => c.id === "ctr-123")).toBeUndefined();
      expect(afterOffline.find((c: any) => c.id === "ctr-456")).toBeDefined();

      expect(mockFetch).toHaveBeenCalledTimes(2);
      const fetchCall = mockFetch.mock.calls[0];
      expect(fetchCall[0]).toContain("/api/contractors/available");
    });
  });
});

describe("Service-to-Service Auth", () => {
  it("validates API key header is sent with Platform B calls", async () => {
    const { platformBClient } = await import("@8gent/api-client/platform-b");

    mockFetch.mockImplementation(() => makeResponse([]));

    await platformBClient.getAvailableContractors();

    const headers = mockFetch.mock.calls[0][1]?.headers as Record<string, string>;
    expect(headers["Content-Type"]).toBe("application/json");
  });
});

// -------------------------------------------------------------------------
// Test 7: Service auth rejection
// -------------------------------------------------------------------------
describe("Test 7: Service auth rejection", () => {
  it("returns 401 when calling /api/contractors/offer without API key", async () => {
    mockFetch.mockImplementationOnce(() =>
      makeResponse({ error: "Unauthorized: invalid or missing service API key" }, 401)
    );

    const res = await mockFetch("/api/contractors/offer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId: "task-1", contractorId: "ctr-1" }),
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toContain("Unauthorized");
  });
});

// -------------------------------------------------------------------------
// Test 8: Offer expiration
// -------------------------------------------------------------------------
describe("Test 8: Offer expiration", () => {
  it("rejects acceptance of an offer that has already expired", async () => {
    const { platformBClient } = await import("@8gent/api-client/platform-b");

    const expiredOffer = {
      taskId: "task-expired",
      title: "Expired Task",
      description: "This should fail",
      complexity: 2,
      harnessType: "coding",
      category: "development",
      payoutMin: 20,
      payoutMax: 40,
      estimatedDuration: 30,
      expiresAt: new Date(Date.now() - 60_000).toISOString(),
    };

    mockFetch.mockImplementationOnce(() =>
      makeResponse({ offerId: "offer-expired" })
    );
    const offerResult = await platformBClient.offerTask("ctr-123", expiredOffer as any);
    expect(offerResult.offerId).toBe("offer-expired");

    mockFetch.mockImplementationOnce(() =>
      makeResponse({ error: "Task offer has expired" }, 400)
    );

    const acceptRes = await mockFetch("/api/contractors/offer/offer-expired/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": "test-key" },
    });

    expect(acceptRes.status).toBe(400);
    const body = await acceptRes.json();
    expect(body.error).toContain("expired");
  });
});

// -------------------------------------------------------------------------
// Test 9: Budget limit in harness
// -------------------------------------------------------------------------
describe("Test 9: Budget limit in LLM gateway", () => {
  it("returns budget error when LLM gateway responds 402", async () => {
    mockFetch.mockImplementationOnce(() =>
      makeResponse({ error: "Budget limit exceeded for this task" }, 402)
    );

    const res = await mockFetch("/llm/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        taskId: "task-456",
        harnessType: "coding",
        prompt: "Generate code",
      }),
    });

    expect(res.status).toBe(402);
    const body = await res.json();
    expect(body.error).toContain("Budget");
  });
});

// -------------------------------------------------------------------------
// Test 10: Multi-task scoring trend
// -------------------------------------------------------------------------
describe("Test 10: Multi-task scoring trend", () => {
  it("fetches scores for multiple tasks and verifies valid range", async () => {
    const { platformCClient } = await import("@8gent/api-client/platform-c");

    const mockScores = Array.from({ length: 5 }, (_, i) => ({
      taskId: `task-${i + 1}`,
      contractorId: "ctr-123",
      composite: 70 + i * 5,
      tokenEfficiency: 75 + i * 3,
      promptQuality: 68 + i * 4,
      outputQuality: 80 + i * 2,
      speed: 72 + i * 3,
      calculatedAt: new Date(Date.now() + i * 86400000).toISOString(),
    }));

    mockFetch.mockImplementationOnce(() => makeResponse(mockScores));

    const scores = await platformCClient.getContractorScores("ctr-123");

    expect(scores).toHaveLength(5);

    for (const score of scores) {
      expect(score.composite).toBeGreaterThanOrEqual(0);
      expect(score.composite).toBeLessThanOrEqual(100);
      expect(score.tokenEfficiency).toBeGreaterThanOrEqual(0);
      expect(score.tokenEfficiency).toBeLessThanOrEqual(100);
      expect(score.outputQuality).toBeGreaterThanOrEqual(0);
      expect(score.outputQuality).toBeLessThanOrEqual(100);
      expect(score.speed).toBeGreaterThanOrEqual(0);
      expect(score.speed).toBeLessThanOrEqual(100);
    }

    const composites = scores.map((s: any) => s.composite);
    for (let i = 1; i < composites.length; i++) {
      expect(composites[i]).toBeGreaterThanOrEqual(composites[i - 1]);
    }
  });
});

// -------------------------------------------------------------------------
// Test 11: Payout calculation accuracy
// -------------------------------------------------------------------------
describe("Test 11: Payout calculation accuracy", () => {
  it("verifies payout formula matches calculatePayout for known inputs", async () => {
    const { calculatePayout } = await import("../../src/lib/payout");

    const result1 = calculatePayout({
      baseRate: 50,
      compositeScore: 92,
      tokensUsed: 300,
      benchmarkTokens: 1000,
    });
    expect(result1.performanceMultiplier).toBe(1.3);
    expect(result1.total).toBe(50 * 1.3 + result1.efficiencyBonus);
    expect(result1.efficiencyBonus).toBeGreaterThan(0);

    const result2 = calculatePayout({
      baseRate: 100,
      compositeScore: 80,
      tokensUsed: 800,
      benchmarkTokens: 1000,
    });
    expect(result2.performanceMultiplier).toBe(1.1);
    expect(result2.efficiencyBonus).toBe(0);
    expect(result2.total).toBe(110);

    const result3 = calculatePayout({
      baseRate: 25,
      compositeScore: 55,
      tokensUsed: 1500,
      benchmarkTokens: 1000,
    });
    expect(result3.performanceMultiplier).toBe(0.9);
    expect(result3.efficiencyBonus).toBe(0);
    expect(result3.total).toBe(22.5);

    const result4 = calculatePayout({
      baseRate: 200,
      compositeScore: 65,
      tokensUsed: 200,
      benchmarkTokens: 1000,
    });
    expect(result4.performanceMultiplier).toBe(1.0);
    expect(result4.efficiencyBonus).toBeGreaterThan(0);
    const expectedBonus = 200 * ((1000 - 200) / 1000) * 0.1;
    expect(result4.efficiencyBonus).toBeCloseTo(expectedBonus, 2);
    expect(result4.total).toBeCloseTo(200 + expectedBonus, 2);
  });
});
