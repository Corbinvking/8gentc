const ENGINE_URL = process.env.ENGINE_API_URL ?? "http://localhost:3001";
const LLM_GATEWAY_URL = process.env.LLM_GATEWAY_URL ?? "http://localhost:3002";
const AGENT_HOST_URL = process.env.AGENT_HOST_URL ?? "http://localhost:3003";

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, { next: { revalidate: 30 } });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function getEngineHealth() {
  return fetchJSON<{ status: string; service: string }>(`${ENGINE_URL}/health`);
}

export async function getGatewayHealth() {
  return fetchJSON<{
    status: string;
    service: string;
    providers: string[];
    cacheStats: { hits: number; misses: number; hitRate: number };
  }>(`${LLM_GATEWAY_URL}/health`);
}

export async function getAgentHostHealth() {
  return fetchJSON<{
    status: string;
    service: string;
    containers: number;
    running: number;
  }>(`${AGENT_HOST_URL}/health`);
}

export async function getAgentHostMetrics() {
  return fetchJSON<{
    totalContainers: number;
    runningContainers: number;
    averageCpuPercent: number;
    averageMemoryPercent: number;
  }>(`${AGENT_HOST_URL}/metrics`);
}

export async function getProviderHealth() {
  return fetchJSON<Array<{
    name: string;
    health: {
      available: boolean;
      latencyMs: number;
      errorRate: number;
      lastChecked: string;
    } | null;
  }>>(`${LLM_GATEWAY_URL}/llm/providers`);
}
