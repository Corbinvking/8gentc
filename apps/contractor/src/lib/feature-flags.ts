import { db } from "@8gent/db/client";
import { featureFlags } from "@8gent/db/schema";
import { eq } from "drizzle-orm";

const flagCache = new Map<string, { enabled: boolean; cachedAt: number }>();
const CACHE_TTL_MS = 60 * 1000;

export async function isFeatureEnabled(flagName: string): Promise<boolean> {
  const cached = flagCache.get(flagName);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return cached.enabled;
  }

  const [flag] = await db
    .select()
    .from(featureFlags)
    .where(eq(featureFlags.name, flagName))
    .limit(1);

  const enabled = flag?.enabled ?? false;
  flagCache.set(flagName, { enabled, cachedAt: Date.now() });
  return enabled;
}

export async function getAllFlags() {
  return db.select().from(featureFlags);
}

export const FLAGS = {
  CODING_HARNESS: "harness_coding",
  CONTENT_HARNESS: "harness_content",
  RESEARCH_HARNESS: "harness_research",
  CONSULTING_HARNESS: "harness_consulting",
  MANAGEMENT_HARNESS: "harness_management",
  SUPPORT_HARNESS: "harness_support",
  GLOBAL_LEADERBOARD: "global_leaderboard",
  STRIPE_PAYOUTS: "stripe_payouts",
  LLM_JUDGE_SCORING: "llm_judge_scoring",
} as const;
