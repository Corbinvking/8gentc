export const APP_NAME = "8gent";

export const PORTS = {
  consumer: 3000,
  contractor: 3010,
  admin: 3020,
  engine: 3001,
  llmGateway: 3002,
  agentHost: 3003,
} as const;

export const LLM_PROVIDERS = ["anthropic", "openai", "google"] as const;
export type LLMProvider = (typeof LLM_PROVIDERS)[number];
