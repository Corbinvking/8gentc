import Redis from "ioredis";

export interface BudgetConfig {
  softLimitPercent: number;
  hardLimitPercent: number;
}

export interface BudgetStatus {
  used: number;
  limit: number;
  remaining: number;
  percentUsed: number;
  softLimitReached: boolean;
  hardLimitReached: boolean;
}

const DEFAULT_BUDGET_CONFIG: BudgetConfig = {
  softLimitPercent: 80,
  hardLimitPercent: 100,
};

export class BudgetEnforcer {
  private redis: Redis;
  private config: BudgetConfig;

  constructor(redisUrl: string, config?: Partial<BudgetConfig>) {
    this.redis = new Redis(redisUrl);
    this.config = { ...DEFAULT_BUDGET_CONFIG, ...config };
  }

  private userKey(userId: string): string {
    return `budget:user:${userId}`;
  }

  private agentKey(agentId: string): string {
    return `budget:agent:${agentId}`;
  }

  async setUserBudget(userId: string, tokenLimit: number): Promise<void> {
    await this.redis.hset(this.userKey(userId), "limit", tokenLimit.toString(), "used", "0");
  }

  async setAgentBudget(agentId: string, tokenLimit: number): Promise<void> {
    await this.redis.hset(this.agentKey(agentId), "limit", tokenLimit.toString(), "used", "0");
  }

  async checkBudget(userId: string, agentId?: string, estimatedTokens = 0): Promise<{
    allowed: boolean;
    userStatus: BudgetStatus;
    agentStatus?: BudgetStatus;
    warning?: string;
  }> {
    const userStatus = await this.getStatus(this.userKey(userId), estimatedTokens);

    if (userStatus.hardLimitReached) {
      return { allowed: false, userStatus, warning: "User token budget exhausted" };
    }

    let agentStatus: BudgetStatus | undefined;
    if (agentId) {
      agentStatus = await this.getStatus(this.agentKey(agentId), estimatedTokens);
      if (agentStatus.hardLimitReached) {
        return { allowed: false, userStatus, agentStatus, warning: "Agent token budget exhausted" };
      }
    }

    const warning = userStatus.softLimitReached
      ? `User budget at ${userStatus.percentUsed.toFixed(0)}%`
      : agentStatus?.softLimitReached
        ? `Agent budget at ${agentStatus.percentUsed.toFixed(0)}%`
        : undefined;

    return { allowed: true, userStatus, agentStatus, warning };
  }

  async recordUsage(userId: string, agentId: string | undefined, tokensUsed: number): Promise<void> {
    await this.redis.hincrby(this.userKey(userId), "used", tokensUsed);
    if (agentId) {
      await this.redis.hincrby(this.agentKey(agentId), "used", tokensUsed);
    }
  }

  async getUserStatus(userId: string): Promise<BudgetStatus> {
    return this.getStatus(this.userKey(userId));
  }

  async resetUserBudget(userId: string): Promise<void> {
    await this.redis.hset(this.userKey(userId), "used", "0");
  }

  private async getStatus(key: string, additionalTokens = 0): Promise<BudgetStatus> {
    const data = await this.redis.hgetall(key);
    const limit = parseInt(data.limit || "1000000", 10);
    const used = parseInt(data.used || "0", 10) + additionalTokens;
    const remaining = Math.max(0, limit - used);
    const percentUsed = (used / limit) * 100;

    return {
      used,
      limit,
      remaining,
      percentUsed,
      softLimitReached: percentUsed >= this.config.softLimitPercent,
      hardLimitReached: percentUsed >= this.config.hardLimitPercent,
    };
  }

  async disconnect(): Promise<void> {
    this.redis.disconnect();
  }
}
