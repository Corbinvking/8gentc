"use client";

import { useState, useEffect } from "react";
import { getLeaderboard, type LeaderboardEntry } from "@/lib/actions/leaderboard";
import { Trophy, Medal, Award, Crown, Loader2 } from "lucide-react";

const RANK_ICONS = [Crown, Medal, Award];

const TIER_COLORS: Record<string, string> = {
  new: "bg-gray-100 text-gray-700",
  established: "bg-blue-100 text-blue-700",
  expert: "bg-purple-100 text-purple-700",
  elite: "bg-amber-100 text-amber-700",
};

export default function LeaderboardPage() {
  const [period, setPeriod] = useState<"weekly" | "monthly" | "all_time">("weekly");
  const [scope, setScope] = useState<"tier" | "global">("global");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getLeaderboard()
      .then(setEntries)
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [period, scope]);

  const topThree = entries.slice(0, 3);

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

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--color-muted-foreground)]" />
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-12 text-center">
          <Trophy className="mx-auto h-8 w-8 text-[var(--color-muted-foreground)]" />
          <p className="mt-3 text-sm text-[var(--color-muted-foreground)]">No contractors ranked yet. Complete tasks to appear on the leaderboard!</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            {topThree.map((entry, i) => {
              const Icon = RANK_ICONS[i] ?? Trophy;
              const colors = ["from-amber-400 to-amber-600", "from-gray-300 to-gray-500", "from-orange-400 to-orange-600"];
              return (
                <div
                  key={entry.contractorId}
                  className={`rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 text-center ${
                    entry.isCurrentUser ? "ring-2 ring-[var(--color-primary)]" : ""
                  }`}
                >
                  <div className={`mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br ${colors[i]} text-white`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <p className="font-bold">{entry.displayName}</p>
                  <p className="text-2xl font-bold text-[var(--color-primary)]">{entry.compositeScore.toFixed(1)}</p>
                  <p className="text-xs text-[var(--color-muted-foreground)]">
                    {entry.completedTasks} tasks · {entry.xp.toLocaleString()} XP
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
                <span className="col-span-3">Contractor</span>
                <span className="col-span-2">Tier</span>
                <span className="col-span-2 text-right">Score</span>
                <span className="col-span-2 text-right">XP</span>
                <span className="col-span-2 text-right">Tasks</span>
              </div>
            </div>
            {entries.map((entry) => (
              <div
                key={entry.contractorId}
                className={`grid grid-cols-12 items-center border-b border-[var(--color-border)] px-6 py-3 last:border-0 ${
                  entry.isCurrentUser ? "bg-[var(--color-primary)]/5" : ""
                }`}
              >
                <span className="col-span-1 text-sm font-bold">#{entry.rank}</span>
                <span className="col-span-3 text-sm font-medium">
                  {entry.displayName}
                  {entry.isCurrentUser && (
                    <span className="ml-2 text-xs text-[var(--color-primary)]">(You)</span>
                  )}
                </span>
                <span className="col-span-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${TIER_COLORS[entry.tier] ?? ""}`}>
                    {entry.tier}
                  </span>
                </span>
                <span className="col-span-2 text-right text-sm font-semibold">{entry.compositeScore.toFixed(1)}</span>
                <span className="col-span-2 text-right text-sm text-[var(--color-muted-foreground)]">{entry.xp.toLocaleString()}</span>
                <span className="col-span-2 text-right text-sm text-[var(--color-muted-foreground)]">{entry.completedTasks}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
