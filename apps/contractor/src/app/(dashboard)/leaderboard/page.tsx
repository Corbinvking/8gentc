"use client";

import { useState } from "react";
import { Trophy, Medal, Award, Crown } from "lucide-react";

interface LeaderboardEntry {
  rank: number;
  name: string;
  score: number;
  tasksCompleted: number;
  tier: string;
  isCurrentUser: boolean;
}

const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, name: "Alex K.", score: 94.5, tasksCompleted: 87, tier: "expert", isCurrentUser: false },
  { rank: 2, name: "Sam R.", score: 91.2, tasksCompleted: 62, tier: "expert", isCurrentUser: false },
  { rank: 3, name: "Jordan M.", score: 88.7, tasksCompleted: 54, tier: "established", isCurrentUser: false },
  { rank: 4, name: "Taylor P.", score: 85.3, tasksCompleted: 41, tier: "established", isCurrentUser: true },
  { rank: 5, name: "Casey W.", score: 82.1, tasksCompleted: 38, tier: "established", isCurrentUser: false },
  { rank: 6, name: "Morgan L.", score: 79.4, tasksCompleted: 29, tier: "new", isCurrentUser: false },
  { rank: 7, name: "Riley S.", score: 76.8, tasksCompleted: 23, tier: "new", isCurrentUser: false },
  { rank: 8, name: "Quinn D.", score: 74.2, tasksCompleted: 19, tier: "new", isCurrentUser: false },
];

const RANK_ICONS = [Crown, Medal, Award];

const TIER_COLORS: Record<string, string> = {
  new: "bg-gray-100 text-gray-700",
  established: "bg-blue-100 text-blue-700",
  expert: "bg-purple-100 text-purple-700",
  elite: "bg-amber-100 text-amber-700",
};

export default function LeaderboardPage() {
  const [period, setPeriod] = useState<"weekly" | "monthly" | "all_time">("weekly");
  const [scope, setScope] = useState<"tier" | "global">("tier");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Leaderboard</h1>
        <div className="flex gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as any)}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-sm"
          >
            <option value="weekly">This Week</option>
            <option value="monthly">This Month</option>
            <option value="all_time">All Time</option>
          </select>
          <div className="flex rounded-lg border border-[var(--color-border)]">
            <button
              onClick={() => setScope("tier")}
              className={`px-3 py-2 text-sm font-medium ${
                scope === "tier"
                  ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)] rounded-l-lg"
                  : "text-[var(--color-muted-foreground)]"
              }`}
            >
              My Tier
            </button>
            <button
              onClick={() => setScope("global")}
              className={`px-3 py-2 text-sm font-medium ${
                scope === "global"
                  ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)] rounded-r-lg"
                  : "text-[var(--color-muted-foreground)]"
              }`}
            >
              Global
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {MOCK_LEADERBOARD.slice(0, 3).map((entry, i) => {
          const Icon = RANK_ICONS[i] ?? Trophy;
          const colors = ["from-amber-400 to-amber-600", "from-gray-300 to-gray-500", "from-orange-400 to-orange-600"];
          return (
            <div
              key={entry.rank}
              className={`rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 text-center ${
                entry.isCurrentUser ? "ring-2 ring-[var(--color-primary)]" : ""
              }`}
            >
              <div className={`mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br ${colors[i]} text-white`}>
                <Icon className="h-6 w-6" />
              </div>
              <p className="font-bold">{entry.name}</p>
              <p className="text-2xl font-bold text-[var(--color-primary)]">{entry.score}</p>
              <p className="text-xs text-[var(--color-muted-foreground)]">
                {entry.tasksCompleted} tasks completed
              </p>
              <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${TIER_COLORS[entry.tier] ?? ""}`}>
                {entry.tier}
              </span>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)]">
        <div className="border-b border-[var(--color-border)] px-6 py-3">
          <div className="grid grid-cols-12 text-xs font-medium text-[var(--color-muted-foreground)] uppercase">
            <span className="col-span-1">Rank</span>
            <span className="col-span-4">Contractor</span>
            <span className="col-span-2">Tier</span>
            <span className="col-span-2 text-right">Score</span>
            <span className="col-span-3 text-right">Tasks</span>
          </div>
        </div>
        {MOCK_LEADERBOARD.map((entry) => (
          <div
            key={entry.rank}
            className={`grid grid-cols-12 items-center border-b border-[var(--color-border)] px-6 py-3 last:border-0 ${
              entry.isCurrentUser ? "bg-[var(--color-primary)]/5" : ""
            }`}
          >
            <span className="col-span-1 text-sm font-bold">#{entry.rank}</span>
            <span className="col-span-4 text-sm font-medium">
              {entry.name}
              {entry.isCurrentUser && (
                <span className="ml-2 text-xs text-[var(--color-primary)]">(You)</span>
              )}
            </span>
            <span className="col-span-2">
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${TIER_COLORS[entry.tier] ?? ""}`}>
                {entry.tier}
              </span>
            </span>
            <span className="col-span-2 text-right text-sm font-semibold">{entry.score}</span>
            <span className="col-span-3 text-right text-sm text-[var(--color-muted-foreground)]">
              {entry.tasksCompleted}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
