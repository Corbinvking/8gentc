import type { TaskOffer, ContractorTier, ContractorSkillCategory } from "@8gent/shared";

const CONTRACTOR_API_URL = process.env.PLATFORM_B_URL ?? process.env.NEXT_PUBLIC_CONTRACTOR_URL ?? "http://localhost:3010";
const SERVICE_TOKEN = process.env.PLATFORM_C_SERVICE_TOKEN ?? "";
const TIMEOUT_MS = Number(process.env.PLATFORM_B_TIMEOUT_MS) || 10_000;
const MAX_RETRIES = 2;
const RETRY_DELAYS = [500, 1500];

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(`${CONTRACTOR_API_URL}${path}`, {
        ...options,
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          ...(SERVICE_TOKEN
            ? { Authorization: `Bearer ${SERVICE_TOKEN}`, "X-Service": "platform-c" }
            : {}),
          ...options?.headers,
        },
      });

      clearTimeout(timeout);

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`Platform B API error ${res.status}: ${body}`);
      }

      return res.json();
    } catch (err) {
      lastError = err as Error;
      if ((err as Error).name === "AbortError") {
        clearTimeout(timeout);
        throw new Error(`Platform B request timed out after ${TIMEOUT_MS}ms: ${path}`);
      }
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, RETRY_DELAYS[attempt]));
      }
    }
  }

  clearTimeout(timeout);
  throw lastError ?? new Error(`Platform B request failed: ${path}`);
}

export interface AvailableContractor {
  id: string;
  displayName: string;
  skills: string[];
  tier: ContractorTier;
  compositeScore: number;
  currentTaskCount: number;
  isOnline: boolean;
}

export interface ContractorSkillsResponse {
  contractorId: string;
  skills: Array<{ category: ContractorSkillCategory; level: string }>;
  tier: ContractorTier;
  compositeScore: number;
}

export interface ScheduleEntry {
  contractorId: string;
  startTime: string;
  endTime: string;
  isOnline: boolean;
}

export interface ContractorNotification {
  type: "task_offer" | "revision_request" | "score_update" | "tier_change" | "warning" | "general";
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export const platformBClient = {
  baseUrl: CONTRACTOR_API_URL,

  async pushTaskOffer(contractorId: string, taskOffer: Record<string, unknown>): Promise<{ offerId: string }> {
    return request("/api/contractors/offer", {
      method: "POST",
      body: JSON.stringify({ contractorId, ...taskOffer }),
    });
  },

  async offerTask(contractorId: string, taskOffer: Omit<TaskOffer, "id" | "contractorId" | "offeredAt" | "status">): Promise<{ offerId: string }> {
    return request("/api/contractors/offer", {
      method: "POST",
      body: JSON.stringify({ contractorId, ...taskOffer }),
    });
  },

  async getAvailableContractors(): Promise<AvailableContractor[]> {
    return request<AvailableContractor[]>("/api/contractors/available");
  },

  async getContractorSkills(contractorId: string): Promise<ContractorSkillsResponse> {
    return request<ContractorSkillsResponse>(`/api/contractors/${contractorId}/skills`);
  },

  async notifyContractor(contractorId: string, notification: ContractorNotification): Promise<{ success: boolean }> {
    return request(`/api/contractors/${contractorId}/notify`, {
      method: "POST",
      body: JSON.stringify(notification),
    });
  },

  async getSchedule(): Promise<ScheduleEntry[]> {
    return request<ScheduleEntry[]>("/api/contractors/schedule");
  },
};
