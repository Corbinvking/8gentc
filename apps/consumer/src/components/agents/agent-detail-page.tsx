"use client";

import { useAgent, usePauseAgent, useResumeAgent, useDeleteAgent } from "@/hooks/use-agents";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Pause,
  Play,
  Trash2,
  Settings,
  Activity,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";

export function AgentDetailPage({ agentId }: { agentId: string }) {
  const { data: agent, isLoading } = useAgent(agentId);
  const pauseAgent = usePauseAgent();
  const resumeAgent = useResumeAgent();
  const deleteAgent = useDeleteAgent();
  const router = useRouter();

  if (isLoading) {
    return <div className="p-6 text-zinc-400">Loading...</div>;
  }

  if (!agent) {
    return <div className="p-6 text-zinc-400">Agent not found</div>;
  }

  const handlePause = async () => {
    await pauseAgent.mutateAsync(agentId);
    toast.success("Agent paused");
  };

  const handleResume = async () => {
    await resumeAgent.mutateAsync(agentId);
    toast.success("Agent resumed");
  };

  const handleDelete = async () => {
    if (!confirm("Delete this agent? This cannot be undone.")) return;
    await deleteAgent.mutateAsync(agentId);
    toast.success("Agent deleted");
    router.push("/agents");
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-6">
      <button
        onClick={() => router.back()}
        className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Agents
      </button>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{agent.name}</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Created {formatDate(agent.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {agent.status === "paused" ? (
            <button
              onClick={handleResume}
              className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 px-3 py-1.5 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              <Play className="h-3.5 w-3.5" />
              Resume
            </button>
          ) : (
            <button
              onClick={handlePause}
              className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 px-3 py-1.5 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              <Pause className="h-3.5 w-3.5" />
              Pause
            </button>
          )}
          <button
            onClick={handleDelete}
            className="inline-flex items-center gap-1.5 rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </div>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-3">
        <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <div className="flex items-center gap-2 text-sm font-medium text-zinc-500">
            <Activity className="h-4 w-4" />
            Status
          </div>
          <p className="mt-2 text-lg font-semibold capitalize">
            {agent.status}
          </p>
        </div>
        <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <div className="flex items-center gap-2 text-sm font-medium text-zinc-500">
            <Settings className="h-4 w-4" />
            Skills
          </div>
          <p className="mt-2 text-lg font-semibold">
            {agent.skills?.length ?? 0}
          </p>
        </div>
        <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <div className="flex items-center gap-2 text-sm font-medium text-zinc-500">
            <FileText className="h-4 w-4" />
            Outputs
          </div>
          <p className="mt-2 text-lg font-semibold">—</p>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="mb-4 text-lg font-semibold">Configuration</h2>
        <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <pre className="text-sm text-zinc-600 dark:text-zinc-400">
            {JSON.stringify(agent.config, null, 2)}
          </pre>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="mb-4 text-lg font-semibold">Skills</h2>
        <div className="flex flex-wrap gap-2">
          {(agent.skills ?? []).map((skill) => (
            <span
              key={skill}
              className="rounded-full bg-zinc-100 px-3 py-1 text-sm dark:bg-zinc-800"
            >
              {skill}
            </span>
          ))}
          {(agent.skills ?? []).length === 0 && (
            <p className="text-sm text-zinc-400">No skills configured</p>
          )}
        </div>
      </div>

      <div className="mt-8">
        <h2 className="mb-4 text-lg font-semibold">Recent Outputs</h2>
        <div className="rounded-lg border border-zinc-200 p-6 text-center text-sm text-zinc-400 dark:border-zinc-800">
          Agent outputs will appear here once the agent runs
        </div>
      </div>
    </div>
  );
}
