"use client";

import type { UsageData } from "@/hooks/use-billing";
import { cn } from "@/lib/utils";

interface UsageDashboardProps {
  usage: UsageData;
}

export function UsageDashboard({ usage }: UsageDashboardProps) {
  const usagePercent = Math.min(
    (usage.runtimeHoursUsed / usage.runtimeHoursLimit) * 100,
    100
  );
  const isNearLimit = usagePercent > 80;
  const isOverLimit = usagePercent >= 100;

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-zinc-200 p-5 dark:border-zinc-800">
        <h3 className="text-sm font-medium text-zinc-500">
          Runtime Hours This Period
        </h3>
        <div className="mt-3 flex items-end gap-2">
          <span className="text-3xl font-bold">
            {usage.runtimeHoursUsed.toFixed(1)}
          </span>
          <span className="mb-1 text-sm text-zinc-400">
            / {usage.runtimeHoursLimit}h
          </span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              isOverLimit
                ? "bg-red-500"
                : isNearLimit
                  ? "bg-amber-500"
                  : "bg-green-500"
            )}
            style={{ width: `${Math.min(usagePercent, 100)}%` }}
          />
        </div>
        {isNearLimit && !isOverLimit && (
          <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
            You&apos;re approaching your runtime limit. Consider upgrading for
            more hours.
          </p>
        )}
        {isOverLimit && (
          <p className="mt-2 text-xs text-red-600 dark:text-red-400">
            You&apos;ve exceeded your runtime limit. Overage charges apply.
          </p>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-zinc-200 p-5 dark:border-zinc-800">
          <h3 className="text-sm font-medium text-zinc-500">
            Projected Usage
          </h3>
          <p className="mt-2 text-2xl font-bold">
            {usage.projectedUsage.toFixed(1)}h
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            Based on current period trends
          </p>
        </div>
        <div className="rounded-lg border border-zinc-200 p-5 dark:border-zinc-800">
          <h3 className="text-sm font-medium text-zinc-500">
            Period Ends
          </h3>
          <p className="mt-2 text-2xl font-bold">
            {new Date(usage.billingPeriodEnd).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </p>
        </div>
      </div>

      {usage.tokensByAgent.length > 0 && (
        <div className="rounded-lg border border-zinc-200 p-5 dark:border-zinc-800">
          <h3 className="mb-4 text-sm font-medium text-zinc-500">
            Token Usage by Agent
          </h3>
          <div className="space-y-3">
            {usage.tokensByAgent.map((agent) => {
              const total = usage.tokensByAgent.reduce(
                (sum, a) => sum + a.tokens,
                0
              );
              const pct = total > 0 ? (agent.tokens / total) * 100 : 0;
              return (
                <div key={agent.agentId}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span>{agent.agentName}</span>
                    <span className="text-zinc-400">
                      {(agent.tokens / 1000).toFixed(1)}K tokens
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <div
                      className="h-full rounded-full bg-zinc-400"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
