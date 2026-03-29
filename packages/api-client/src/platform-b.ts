import type { TaskOffer, ContractorTier, ContractorSkillCategory } from "@8gent/shared";

const CONTRACTOR_API_URL = process.env.NEXT_PUBLIC_CONTRACTOR_URL ?? "http://localhost:3010";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${CONTRACTOR_API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Platform B API error ${res.status}: ${body}`);
  }
  return res.json();
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
