"use client";

import { useState, useEffect } from "react";
import { getAvailableTasks, getActiveTasks, acceptTask, rejectTask } from "@/lib/actions/tasks";
import { toast } from "sonner";
import { ListTodo, Clock, DollarSign, Zap, Code, FileText, Search, Filter, AlertCircle, RotateCcw } from "lucide-react";
import Link from "next/link";

const HARNESS_ICONS: Record<string, typeof Code> = {
  coding: Code,
  content: FileText,
  research: Search,
};

const COMPLEXITY_LABELS = ["", "Simple", "Moderate", "Intermediate", "Complex", "Expert"];

export default function TasksPage() {
  const [tab, setTab] = useState<"available" | "active">("available");
  const [tasks, setTasks] = useState<any[]>([]);
  const [activeTasks, setActiveTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    loadTasks();
  }, [tab, categoryFilter]);

  async function loadTasks() {
    setLoading(true);
    try {
      if (tab === "available") {
        const result = await getAvailableTasks(
          categoryFilter ? { category: categoryFilter } : undefined
        );
        setTasks(result.tasks);
      } else {
        const result = await getActiveTasks();
        setActiveTasks(result);
      }
    } catch {
      toast.error("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }

  async function handleAccept(offerId: string) {
    const result = await acceptTask(offerId);
    if ("error" in result) {
      toast.error(result.error);
    } else {
      toast.success("Task accepted!");
      loadTasks();
    }
  }

  async function handleReject(offerId: string) {
    const result = await rejectTask(offerId, rejectReason || undefined);
    if ("error" in result) {
      toast.error(result.error);
    } else {
      toast.info("Task passed");
      setRejectingId(null);
      setRejectReason("");
      loadTasks();
    }
  }

  const needsRevisionTasks = activeTasks.filter((t: any) => t.needsRevision);
  const otherActiveTasks = activeTasks.filter((t: any) => !t.needsRevision);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tasks</h1>
        <div className="flex rounded-lg border border-[var(--color-border)] bg-[var(--color-card)]">
          <button
            onClick={() => setTab("available")}
            className={`px-4 py-2 text-sm font-medium ${
              tab === "available"
                ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)] rounded-l-lg"
                : "text-[var(--color-muted-foreground)]"
            }`}
          >
            Available
          </button>
          <button
            onClick={() => setTab("active")}
            className={`relative px-4 py-2 text-sm font-medium ${
              tab === "active"
                ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)] rounded-r-lg"
                : "text-[var(--color-muted-foreground)]"
            }`}
          >
            Active
            {needsRevisionTasks.length > 0 && tab !== "active" && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-destructive)] text-[10px] font-bold text-white">
                {needsRevisionTasks.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {tab === "available" && (
        <div className="flex gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-sm"
          >
            <option value="">All Categories</option>
            <option value="development">Development</option>
            <option value="content_creation">Content</option>
            <option value="research">Research</option>
            <option value="consulting">Consulting</option>
          </select>
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-[var(--color-muted-foreground)]">Loading tasks...</div>
      ) : tab === "available" ? (
        <div className="space-y-3">
          {tasks.length === 0 ? (
            <div className="py-12 text-center">
              <ListTodo className="mx-auto mb-3 h-12 w-12 text-[var(--color-muted-foreground)]" />
              <p className="text-[var(--color-muted-foreground)]">No tasks available right now</p>
              <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                Make sure you are online to receive task offers
              </p>
            </div>
          ) : (
            tasks.map((task: any) => {
              const HarnessIcon = HARNESS_ICONS[task.harnessType] ?? Zap;
              return (
                <div
                  key={task.id}
                  className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 transition-shadow hover:shadow-md"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <HarnessIcon className="h-4 w-4 text-[var(--color-primary)]" />
                        <h3 className="font-semibold">{task.title}</h3>
                      </div>
                      <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                        {task.description?.slice(0, 150)}
                        {task.description?.length > 150 ? "..." : ""}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[var(--color-muted-foreground)]">
                        <span className="flex items-center gap-1 capitalize">
                          <Filter className="h-3 w-3" />
                          {(task.category ?? "general").replace("_", " ")}
                        </span>
                        <span className="flex items-center gap-1">
                          <Zap className="h-3 w-3" />
                          {COMPLEXITY_LABELS[task.complexity] ?? `Level ${task.complexity}`}
                        </span>
                        {task.estimatedDuration && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {task.estimatedDuration} min
                          </span>
                        )}
                        {(task.payoutMin || task.payoutMax) && (
                          <span className="flex items-center gap-1 font-medium text-[var(--color-success)]">
                            <DollarSign className="h-3 w-3" />
                            ${task.payoutMin ?? 0}–${task.payoutMax ?? 0}
                          </span>
                        )}
                        {task.expiresAt && (
                          <span className="text-[var(--color-warning)]">
                            Expires {new Date(task.expiresAt).toLocaleTimeString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="ml-4 flex flex-col gap-2">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setRejectingId(rejectingId === task.id ? null : task.id)}
                          className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium hover:bg-[var(--color-muted)]"
                        >
                          Pass
                        </button>
                        <button
                          onClick={() => handleAccept(task.id)}
                          className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-primary-foreground)]"
                        >
                          Accept
                        </button>
                      </div>
                      {rejectingId === task.id && (
                        <div className="flex gap-1">
                          <input
                            type="text"
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Reason (optional)"
                            className="flex-1 rounded border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1 text-xs"
                          />
                          <button
                            onClick={() => handleReject(task.id)}
                            className="rounded bg-[var(--color-muted)] px-2 py-1 text-xs font-medium"
                          >
                            Confirm
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {needsRevisionTasks.length > 0 && (
            <div className="space-y-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-destructive)]">
                <AlertCircle className="h-4 w-4" />
                Needs Revision ({needsRevisionTasks.length})
              </h2>
              {needsRevisionTasks.map((task: any) => (
                <Link
                  key={task.id}
                  href={`/workspace/${task.taskId}`}
                  className="block rounded-xl border-2 border-[var(--color-destructive)]/30 bg-[var(--color-card)] p-5 transition-shadow hover:shadow-md"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <RotateCcw className="h-4 w-4 text-[var(--color-destructive)]" />
                        <h3 className="font-semibold">{task.title}</h3>
                        <span className="rounded-full bg-[var(--color-destructive)]/10 px-2 py-0.5 text-xs font-medium text-[var(--color-destructive)]">
                          Revision {task.revisionNumber + 1}/2
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                        Client has requested changes. Open the workspace to review and resubmit.
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          <div className="space-y-3">
            {otherActiveTasks.length === 0 && needsRevisionTasks.length === 0 ? (
              <div className="py-12 text-center">
                <ListTodo className="mx-auto mb-3 h-12 w-12 text-[var(--color-muted-foreground)]" />
                <p className="text-[var(--color-muted-foreground)]">No active tasks</p>
              </div>
            ) : (
              otherActiveTasks.map((task: any) => (
                <Link
                  key={task.id}
                  href={`/workspace/${task.taskId}`}
                  className="block rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 transition-shadow hover:shadow-md"
                >
                  <h3 className="font-semibold">{task.title}</h3>
                  <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                    {task.description?.slice(0, 100)}
                  </p>
                  <div className="mt-3 flex items-center gap-3 text-xs text-[var(--color-muted-foreground)]">
                    <span className="capitalize">{(task.harnessType ?? "general").replace("_", " ")} harness</span>
                    <span>Accepted {new Date(task.respondedAt ?? task.offeredAt).toLocaleDateString()}</span>
                    {task.lastDeliverableStatus === "submitted" && (
                      <span className="rounded-full bg-[var(--color-warning)]/10 px-2 py-0.5 text-[var(--color-warning)]">
                        Awaiting Review
                      </span>
                    )}
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
