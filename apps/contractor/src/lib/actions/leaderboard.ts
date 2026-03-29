"use server";

import { db } from "@8gent/db/client";
import { contractors } from "@8gent/db/schema";
import { desc, asc, sql } from "drizzle-orm";
import { requireContractor } from "@/lib/auth";

export interface LeaderboardEntry {
  rank: number;
  contractorId: string;
  displayName: string;
  compositeScore: number;
  xp: number;
  completedTasks: number;
  tier: string;
  isCurrentUser: boolean;
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  const currentContractor = await requireContractor();

  const rows = await db
    .select({
      id: contractors.id,
      displayName: contractors.displayName,
      compositeScore: contractors.compositeScore,
      xp: contractors.xp,
      completedTasks: contractors.completedTasks,
      tier: contractors.tier,
      createdAt: contractors.createdAt,
    })
    .from(contractors)
    .where(sql`${contractors.status} = 'active' OR ${contractors.onboardingStatus} = 'approved'`)
    .orderBy(
      desc(contractors.compositeScore),
      desc(contractors.xp),
      asc(contractors.createdAt)
    )
    .limit(100);

  let currentRank = 0;
  let prevScore: number | null = null;
  let prevXp: number | null = null;

  return rows.map((row, i) => {
    const score = Number(row.compositeScore ?? 0);
    const xp = row.xp ?? 0;

    if (score !== prevScore || xp !== prevXp) {
      currentRank = i + 1;
    }
    prevScore = score;
    prevXp = xp;

    return {
      rank: currentRank,
      contractorId: row.id,
      displayName: row.displayName,
      compositeScore: score,
      xp,
      completedTasks: row.completedTasks ?? 0,
      tier: row.tier,
      isCurrentUser: row.id === currentContractor.id,
    };
  });
}
