"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { useAgents } from "@/hooks/use-agents";
import { AgentCard } from "./agent-card";

export function AgentListPage() {
  const { data: agents = [], isLoading } = useAgents();

  return (
    <div className="px-6 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Agents</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Your AI agents working on your behalf
          </p>
        </div>
        <Link
          href="/agents/new"
          className="inline-flex items-center gap-2 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          <Plus className="h-4 w-4" />
          Create Agent
        </Link>
      </div>

      {isLoading && (
        <div className="mt-8 text-sm text-zinc-400">Loading agents...</div>
      )}

      {!isLoading && agents.length === 0 && (
        <div className="mt-12 flex flex-col items-center text-center text-zinc-400">
          <p className="text-lg font-medium">No agents yet</p>
          <p className="mt-1 text-sm">
            Create your first agent to start automating tasks
          </p>
          <Link
            href="/agents/new"
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            <Plus className="h-4 w-4" />
            Create Agent
          </Link>
        </div>
      )}

      {agents.length > 0 && (
        <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      )}
    </div>
  );
}
