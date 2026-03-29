import Redis from "ioredis";
import { createHash } from "crypto";

export interface CachedResponse {
  response: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cachedAt: number;
}

export interface CacheConfig {
  defaultTtlSeconds: number;
  ttlByTaskType: Record<string, number>;
  maxEntries: number;
}

const DEFAULT_CONFIG: CacheConfig = {
  defaultTtlSeconds: 3600,
  ttlByTaskType: {
    faq: 86400,
    summarization: 7200,
    translation: 86400,
    formatting: 86400,
    analysis: 1800,
    code: 900,
  },
  maxEntries: 100_000,
};

export class SemanticCache {
  private redis: Redis;
  private config: CacheConfig;
  private hits = 0;
  private misses = 0;

  constructor(redisUrl: string, config?: Partial<CacheConfig>) {
    this.redis = new Redis(redisUrl);
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  private cacheKey(userId: string, promptHash: string): string {
    return `llm:cache:${userId}:${promptHash}`;
  }

  private hashPrompt(prompt: string, systemPrompt?: string): string {
    const content = `${systemPrompt ?? ""}:${prompt}`;
    return createHash("sha256").update(content).digest("hex").slice(0, 32);
  }

  async get(
    userId: string,
    prompt: string,
    systemPrompt?: string
  ): Promise<CachedResponse | null> {
    const hash = this.hashPrompt(prompt, systemPrompt);
    const key = this.cacheKey(userId, hash);
    const raw = await this.redis.get(key);

    if (raw) {
      this.hits++;
      return JSON.parse(raw);
    }

    this.misses++;
    return null;
  }

  async set(
    userId: string,
    prompt: string,
    systemPrompt: string | undefined,
    response: CachedResponse,
    taskType?: string
  ): Promise<void> {
    const hash = this.hashPrompt(prompt, systemPrompt);
    const key = this.cacheKey(userId, hash);
    const ttl =
      (taskType ? this.config.ttlByTaskType[taskType] : undefined) ??
      this.config.defaultTtlSeconds;

    await this.redis.setex(key, ttl, JSON.stringify(response));
  }

  async invalidateUser(userId: string): Promise<void> {
    const pattern = `llm:cache:${userId}:*`;
    let cursor = "0";
    do {
      const [next, keys] = await this.redis.scan(cursor, "MATCH", pattern, "COUNT", 100);
      cursor = next;
      if (keys.length > 0) await this.redis.del(...keys);
    } while (cursor !== "0");
  }

  getStats(): { hits: number; misses: number; hitRate: number } {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
    };
  }

  async disconnect(): Promise<void> {
    this.redis.disconnect();
  }
}
