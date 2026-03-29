import type {
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

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${ENGINE_API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Platform C API error ${res.status}: ${body}`);
  }
  return res.json();
}

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
