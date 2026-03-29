"use server";

import { requireContractor } from "@/lib/auth";
import { platformCClient } from "@8gent/api-client/platform-c";
import type { PerformanceScore } from "@8gent/shared";
import { calculateCompositeScore } from "@/lib/scoring";

export async function getPerformanceScores(): Promise<{
  scores: PerformanceScore[];
  source: "platform_c" | "local_fallback";
}> {
  const contractor = await requireContractor();

  try {
    const scores = await platformCClient.getContractorScores(contractor.id);
    return { scores, source: "platform_c" };
  } catch {
    return { scores: [], source: "local_fallback" };
  }
}

export async function getBenchmarkData(taskType: string) {
  try {
    const benchmark = await platformCClient.getBenchmarks(taskType);
    return { benchmark, source: "platform_c" as const };
  } catch {
    return {
      benchmark: {
        taskType,
        avgTokens: 500,
        avgTimeMinutes: 45,
        avgScore: 65,
        sampleSize: 0,
      },
      source: "local_fallback" as const,
    };
  }
}

export async function getLatestCompositeScore(): Promise<{
  composite: number;
  tokenEfficiency: number;
  promptQuality: number;
  outputQuality: number;
  speed: number;
  source: "platform_c" | "local";
} | null> {
  const contractor = await requireContractor();

  try {
    const scores = await platformCClient.getContractorScores(contractor.id);
    if (scores.length === 0) return null;

    const latest = scores.sort(
      (a, b) => new Date(b.calculatedAt).getTime() - new Date(a.calculatedAt).getTime()
    )[0];

    return {
      composite: latest.composite,
      tokenEfficiency: latest.tokenEfficiency,
      promptQuality: latest.promptQuality,
      outputQuality: latest.outputQuality,
      speed: latest.speed,
      source: "platform_c",
    };
  } catch {
    const localComposite = Number(contractor.compositeScore ?? 0);
    return {
      composite: localComposite,
      tokenEfficiency: 0,
      promptQuality: 0,
      outputQuality: 0,
      speed: 0,
      source: "local",
    };
  }
}
