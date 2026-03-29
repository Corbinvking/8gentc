"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Clock, FileText, RotateCcw, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";

interface TaskProject {
  taskId: string;
  title: string;
  status: string;
  milestones: Array<{
    name: string;
    status: "pending" | "in_progress" | "completed";
    completedAt?: string;
  }>;
}

interface Deliverable {
  id: string;
  taskId: string;
  title: string;
  description: string;
  fileUrl?: string;
  status: "pending_review" | "approved" | "revision_requested";
  createdAt: string;
}

export function EnterpriseDashboard({
  taskIds,
}: {
  taskIds: string[];
}) {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Active Projects</h2>
      {taskIds.length === 0 && (
        <p className="text-sm text-zinc-400">
          No active enterprise projects. Escalated tasks will appear here.
        </p>
      )}
      {taskIds.map((taskId) => (
        <ProjectCard key={taskId} taskId={taskId} />
      ))}
    </div>
  );
}

function ProjectCard({ taskId }: { taskId: string }) {
  const { data: project } = useQuery({
    queryKey: ["task-status", taskId],
    queryFn: async () => {
      const res = await fetch(`/api/tasks/${taskId}/status`);
      if (!res.ok) return null;
      return res.json() as Promise<TaskProject>;
    },
    refetchInterval: 30_000,
  });

  const { data: deliverables = [] } = useQuery({
    queryKey: ["task-deliverables", taskId],
    queryFn: async () => {
      const res = await fetch(`/api/tasks/${taskId}/deliverables`);
      if (!res.ok) return [];
      return res.json() as Promise<Deliverable[]>;
    },
  });

  if (!project) return null;

  return (
    <div className="rounded-lg border border-zinc-200 p-5 dark:border-zinc-800">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">{project.title ?? `Project ${taskId.slice(0, 8)}`}</h3>
        <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
          {project.status}
        </span>
      </div>

      {project.milestones?.length > 0 && (
        <div className="mt-4">
          <h4 className="mb-2 text-xs font-medium uppercase text-zinc-500">
            Milestones
          </h4>
          <div className="space-y-1.5">
            {project.milestones.map((ms) => (
              <div
                key={ms.name}
                className="flex items-center gap-2 text-sm"
              >
                {ms.status === "completed" ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : ms.status === "in_progress" ? (
                  <Clock className="h-4 w-4 text-blue-500" />
                ) : (
                  <div className="h-4 w-4 rounded-full border-2 border-zinc-300 dark:border-zinc-600" />
                )}
                <span
                  className={cn(
                    ms.status === "completed" && "text-zinc-400 line-through"
                  )}
                >
                  {ms.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {deliverables.length > 0 && (
        <div className="mt-4">
          <h4 className="mb-2 text-xs font-medium uppercase text-zinc-500">
            Deliverables
          </h4>
          <div className="space-y-2">
            {deliverables.map((d) => (
              <DeliverableRow key={d.id} deliverable={d} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DeliverableRow({ deliverable }: { deliverable: Deliverable }) {
  const queryClient = useQueryClient();

  const approve = useMutation({
    mutationFn: async () => {
      await fetch(
        `/api/tasks/${deliverable.taskId}/deliverables/${deliverable.id}/approve`,
        { method: "POST" }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["task-deliverables", deliverable.taskId],
      });
      toast.success("Deliverable approved");
    },
  });

  const requestRevision = useMutation({
    mutationFn: async () => {
      await fetch(
        `/api/tasks/${deliverable.taskId}/deliverables/${deliverable.id}/revision`,
        { method: "POST" }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["task-deliverables", deliverable.taskId],
      });
      toast.success("Revision requested");
    },
  });

  const statusBadge: Record<string, string> = {
    pending_review:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    approved:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    revision_requested:
      "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };

  return (
    <div className="flex items-center justify-between rounded-md border border-zinc-100 p-3 dark:border-zinc-800">
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-zinc-400" />
        <div>
          <span className="text-sm font-medium">{deliverable.title}</span>
          <span
            className={cn(
              "ml-2 rounded-full px-2 py-0.5 text-xs font-medium",
              statusBadge[deliverable.status] ?? statusBadge.pending_review
            )}
          >
            {deliverable.status.replace("_", " ")}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1">
        {deliverable.fileUrl && (
          <a
            href={deliverable.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
        {deliverable.status === "pending_review" && (
          <>
            <button
              onClick={() => approve.mutate()}
              className="rounded px-2 py-1 text-xs font-medium text-green-600 hover:bg-green-50 dark:hover:bg-green-950"
            >
              Approve
            </button>
            <button
              onClick={() => requestRevision.mutate()}
              className="rounded px-2 py-1 text-xs font-medium text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950"
            >
              Request Changes
            </button>
          </>
        )}
      </div>
    </div>
  );
}
