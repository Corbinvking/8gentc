"use client";

import Link from "next/link";
import { Bot, Pause, Play, AlertCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/utils";
import type { Agent, AgentStatus } from "@8gent/shared";

const statusConfig: Record<
  AgentStatus,
  { label: string; color: string; icon: React.ComponentType<{ className?: string }> }
> = {
  idle: {
    label: "Idle",
    color: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
    icon: Clock,
  },
  running: {
    label: "Running",
    color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    icon: Play,
  },
  paused: {
    label: "Paused",
    color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    icon: Pause,
  },
  error: {
    label: "Error",
    color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    icon: AlertCircle,
  },
  terminated: {
    label: "Terminated",
    color: "bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500",
    icon: Clock,
  },
};

interface AgentCardProps {
  agent: Agent;
}

export function AgentCard({ agent }: AgentCardProps) {
  const status = statusConfig[agent.status] ?? statusConfig.idle;
  const StatusIcon = status.icon;

  return (
    <Link
      href={`/agents/${agent.id}`}
      className="block rounded-lg border border-zinc-200 p-4 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
            <Bot className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
          </div>
          <div>
            <h3 className="font-medium">{agent.name}</h3>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-zinc-400">
              <span>{agent.skills?.length ?? 0} skills</span>
              <span>·</span>
              <span>{formatRelativeTime(agent.updatedAt)}</span>
            </div>
          </div>
        </div>

        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
            status.color
          )}
        >
          <StatusIcon className="h-3 w-3" />
          {status.label}
        </span>
      </div>
    </Link>
  );
}
