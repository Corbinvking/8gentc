import type {
  Agent,
  AgentStatus,
  Task,
  TaskStatus,
  TaskOffer,
  Deliverable,
  TaskClarification,
  TaskSubtask,
  HarnessType,
  PerformanceScore,
  PromptCapture,
  LlmCallCapture,
  SessionCapture,
} from "@8gent/shared";

const ENGINE_API_URL = process.env.ENGINE_API_URL ?? "http://localhost:3001";
const SERVICE_TOKEN = process.env.PLATFORM_C_SERVICE_TOKEN ?? "";

const PLATFORM_C_TIMEOUT_MS = 60_000;

function serviceHeaders(): Record<string, string> {
  return SERVICE_TOKEN ? { "X-API-Key": SERVICE_TOKEN, "X-Service": "platform-a" } : {};
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PLATFORM_C_TIMEOUT_MS);

  try {
    const res = await fetch(`${ENGINE_API_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...serviceHeaders(),
        ...options?.headers,
      },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Platform C API error ${res.status}: ${body}`);
    }
    return res.json() as Promise<T>;
  } finally {
    clearTimeout(timeout);
  }
}

function streamRequest(
  path: string,
  body: Record<string, unknown>
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      const abortController = new AbortController();
      const timeout = setTimeout(
        () => abortController.abort(),
        PLATFORM_C_TIMEOUT_MS
      );

      try {
        const res = await fetch(`${ENGINE_API_URL}${path}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...serviceHeaders() },
          body: JSON.stringify(body),
          signal: abortController.signal,
        });
        if (!res.ok || !res.body) {
          controller.enqueue(
            encoder.encode("Error connecting to Platform C engine")
          );
          controller.close();
          return;
        }
        const reader = res.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          controller.enqueue(value);
        }
      } catch (err) {
        const msg =
          err instanceof DOMException && err.name === "AbortError"
            ? "Request timed out — the response took too long."
            : "Connection to engine failed. Please try again.";
        controller.enqueue(encoder.encode(msg));
      } finally {
        clearTimeout(timeout);
        controller.close();
      }
    },
  });
}

// ---------------------------------------------------------------------------
// Consumer-facing types (Platform A)
// ---------------------------------------------------------------------------

export interface ChatHistoryMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ChatMessagePayload {
  message: string;
  userId: string;
  workspaceId: string;
  threadId?: string;
  noteContextId?: string;
  attachments?: string[];
  history?: ChatHistoryMessage[];
}

export interface CreateAgentPayload {
  name: string;
  ownerId: string;
  skills: string[];
  config: Record<string, unknown>;
}

export interface UpdateAgentPayload {
  name?: string;
  skills?: string[];
  config?: Record<string, unknown>;
}

export interface AgentOutput {
  id: string;
  agentId: string;
  type: string;
  content: string;
  noteId?: string;
  createdAt: string;
}

export interface AgentRuntimeStatus {
  status: AgentStatus;
  lastRunAt: string | null;
  nextRunAt: string | null;
  runsThisPeriod: number;
  tokensThisPeriod: number;
}

export interface ProactiveNotification {
  id: string;
  type: "goal_nudge" | "agent_finding" | "stale_content" | "system";
  title: string;
  body: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface FeedbackPayload {
  notificationId: string;
  helpful: boolean;
}

export interface UsageResponse {
  runtimeHoursUsed: number;
  runtimeHoursLimit: number;
  tokensByAgent: Array<{ agentId: string; agentName: string; tokens: number }>;
  projectedUsage: number;
  billingPeriodEnd: string;
}

export interface EscalateTaskPayload {
  title: string;
  description: string;
  userId: string;
  workspaceId: string;
  contextNoteIds: string[];
  knowledgeExcerpts?: Array<{ noteId: string; title: string; content: string }>;
  estimatedBudget?: number;
}

export interface TaskStatusResponse {
  taskId: string;
  status: TaskStatus;
  milestones: Array<{
    name: string;
    status: "pending" | "in_progress" | "completed";
    completedAt?: string;
  }>;
  updatedAt: string;
}

export interface DeliverableResponse {
  id: string;
  taskId: string;
  title: string;
  description: string;
  fileUrl?: string;
  status: "pending_review" | "approved" | "revision_requested";
  createdAt: string;
}

export interface AmbitionScore {
  score: number;
  dimensions: {
    estimatedDuration: number;
    domainComplexity: number;
    humanJudgmentRequired: number;
    estimatedTokenCost: number;
  };
  exceedsThreshold: boolean;
  reasoning: string;
}

// ---------------------------------------------------------------------------
// Contractor-facing types (Platform B)
// ---------------------------------------------------------------------------

export interface AvailableTasksFilter {
  skills?: string[];
  category?: string;
  complexity?: number;
  minPayout?: number;
  maxDuration?: number;
  sortBy?: "payout" | "deadline" | "match_score";
}

export interface TaskDetails {
  id: string;
  title: string;
  description: string;
  category: string;
  complexity: number;
  harnessType: HarnessType;
  estimatedDuration: number;
  payoutMin: number;
  payoutMax: number;
  deadline?: string;
  subtasks: TaskSubtask[];
  successCriteria: string[];
  clientContextSummary?: string;
}

export interface TaskContext {
  knowledgeGraphExcerpts: Array<{ title: string; content: string }>;
  relevantDocuments: Array<{ name: string; url: string }>;
}

export interface Benchmark {
  taskType: string;
  avgTokens: number;
  avgTimeMinutes: number;
  avgScore: number;
  sampleSize: number;
}

export const platformCClient = {
  baseUrl: ENGINE_API_URL,

  // -------------------------------------------------------------------------
  // Consumer-facing methods (Platform A)
  // -------------------------------------------------------------------------

  chat: {
    sendMessage(payload: ChatMessagePayload): ReadableStream<Uint8Array> {
      return streamRequest("/chat/message", payload as unknown as Record<string, unknown>);
    },
  },

  agents: {
    list(params?: { userId?: string; workspaceId?: string }) {
      const qs = new URLSearchParams();
      if (params?.userId) qs.set("userId", params.userId);
      if (params?.workspaceId) qs.set("workspaceId", params.workspaceId);
      const query = qs.toString();
      return request<Agent[]>(`/agents${query ? `?${query}` : ""}`);
    },
    create(payload: CreateAgentPayload) {
      return request<Agent>("/agents", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    update(agentId: string, payload: UpdateAgentPayload) {
      return request<Agent>(`/agents/${agentId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
    },
    delete(agentId: string) {
      return request<void>(`/agents/${agentId}`, { method: "DELETE" });
    },
    getOutputs(agentId: string, params?: { limit?: number; offset?: number }) {
      const qs = new URLSearchParams();
      if (params?.limit) qs.set("limit", String(params.limit));
      if (params?.offset) qs.set("offset", String(params.offset));
      const query = qs.toString();
      return request<AgentOutput[]>(
        `/agents/${agentId}/outputs${query ? `?${query}` : ""}`
      );
    },
    getStatus(agentId: string) {
      return request<AgentRuntimeStatus>(`/agents/${agentId}/status`);
    },
    pause(agentId: string) {
      return request<Agent>(`/agents/${agentId}/pause`, { method: "POST" });
    },
    resume(agentId: string) {
      return request<Agent>(`/agents/${agentId}/resume`, { method: "POST" });
    },
  },

  understanding: {
    getNotifications(params?: { userId?: string; limit?: number }) {
      const qs = new URLSearchParams();
      if (params?.userId) qs.set("userId", params.userId);
      if (params?.limit) qs.set("limit", String(params.limit));
      const query = qs.toString();
      return request<ProactiveNotification[]>(
        `/understanding/notifications${query ? `?${query}` : ""}`
      );
    },
    submitFeedback(payload: FeedbackPayload) {
      return request<void>("/understanding/feedback", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
  },

  metering: {
    getUsage(params: { userId: string; period?: string }) {
      const qs = new URLSearchParams({ userId: params.userId });
      if (params.period) qs.set("period", params.period);
      return request<UsageResponse>(`/metering/usage?${qs}`);
    },
  },

  tasks: {
    escalate(payload: EscalateTaskPayload) {
      return request<{ taskId: string }>("/tasks/escalate", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    getStatus(taskId: string) {
      return request<TaskStatusResponse>(`/tasks/${taskId}/status`);
    },
    getDeliverables(taskId: string) {
      return request<DeliverableResponse[]>(`/tasks/${taskId}/deliverables`);
    },
    scoreAmbition(payload: { title: string; description: string; userId: string }) {
      return request<AmbitionScore>("/tasks/score-ambition", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    approveDeliverable(taskId: string, deliverableId: string) {
      return request<DeliverableResponse>(
        `/tasks/${taskId}/deliverables/${deliverableId}/approve`,
        { method: "POST" }
      );
    },
    requestRevision(
      taskId: string,
      deliverableId: string,
      reason: string
    ) {
      return request<DeliverableResponse>(
        `/tasks/${taskId}/deliverables/${deliverableId}/revision`,
        {
          method: "POST",
          body: JSON.stringify({ reason }),
        }
      );
    },
  },

  // -------------------------------------------------------------------------
  // Contractor-facing methods (Platform B)
  // -------------------------------------------------------------------------

  async getAvailableTasks(contractorId: string, filters?: AvailableTasksFilter): Promise<TaskOffer[]> {
    const params = new URLSearchParams({ contractorId });
    if (filters?.skills) params.set("skills", filters.skills.join(","));
    if (filters?.category) params.set("category", filters.category);
    if (filters?.complexity) params.set("complexity", String(filters.complexity));
    if (filters?.minPayout) params.set("minPayout", String(filters.minPayout));
    if (filters?.maxDuration) params.set("maxDuration", String(filters.maxDuration));
    if (filters?.sortBy) params.set("sortBy", filters.sortBy);
    return request<TaskOffer[]>(`/dispatch/available-tasks?${params}`);
  },

  async acceptTask(taskId: string, contractorId: string): Promise<{ success: boolean }> {
    return request("/dispatch/accept", {
      method: "POST",
      body: JSON.stringify({ taskId, contractorId }),
    });
  },

  async rejectTask(taskId: string, contractorId: string, reason?: string): Promise<{ success: boolean }> {
    return request("/dispatch/reject", {
      method: "POST",
      body: JSON.stringify({ taskId, contractorId, reason }),
    });
  },

  async getTaskDetails(taskId: string): Promise<TaskDetails> {
    return request<TaskDetails>(`/tasks/${taskId}`);
  },

  async getTaskContext(taskId: string): Promise<TaskContext> {
    return request<TaskContext>(`/tasks/${taskId}/context`);
  },

  async submitDeliverable(
    taskId: string,
    data: { contractorId: string; content: string; fileUrls: string[] }
  ): Promise<Deliverable> {
    return request<Deliverable>(`/tasks/${taskId}/deliverable`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async submitRevision(
    taskId: string,
    data: { contractorId: string; content: string; fileUrls: string[]; revisionOf: string }
  ): Promise<Deliverable> {
    return request<Deliverable>(`/tasks/${taskId}/revision`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async sendClarification(taskId: string, message: string, contractorId: string): Promise<TaskClarification> {
    return request<TaskClarification>(`/tasks/${taskId}/clarification`, {
      method: "POST",
      body: JSON.stringify({ message, contractorId }),
    });
  },

  async getClarifications(taskId: string): Promise<TaskClarification[]> {
    return request<TaskClarification[]>(`/tasks/${taskId}/clarifications`);
  },

  async logPrompt(data: Omit<PromptCapture, "id">): Promise<{ id: string }> {
    return request("/telemetry/prompt", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async logLlmCall(data: Omit<LlmCallCapture, "id">): Promise<{ id: string }> {
    return request("/telemetry/llm-call", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async logSession(data: Omit<SessionCapture, "id">): Promise<{ id: string }> {
    return request("/telemetry/session", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async getContractorScores(contractorId: string): Promise<PerformanceScore[]> {
    return request<PerformanceScore[]>(`/telemetry/scores/${contractorId}`);
  },

  async getBenchmarks(taskType: string): Promise<Benchmark> {
    return request<Benchmark>(`/telemetry/benchmarks/${taskType}`);
  },
};
