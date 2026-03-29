import { requireContractor } from "@/lib/auth";
import { db } from "@8gent/db/client";
import { taskOffers } from "@8gent/db/schema";
import { eq, and } from "drizzle-orm";
import Link from "next/link";
import { Wrench, Code, FileText, Search } from "lucide-react";

const HARNESS_ICONS: Record<string, typeof Code> = {
  coding: Code,
  content: FileText,
  research: Search,
};

export default async function WorkspaceIndexPage() {
  const contractor = await requireContractor();

  const active = await db
    .select()
    .from(taskOffers)
    .where(and(eq(taskOffers.contractorId, contractor.id), eq(taskOffers.status, "accepted")));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Workspace</h1>

      {active.length === 0 ? (
        <div className="py-12 text-center">
          <Wrench className="mx-auto mb-3 h-12 w-12 text-[var(--color-muted-foreground)]" />
          <p className="text-[var(--color-muted-foreground)]">No active tasks</p>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            Accept a task from the marketplace to start working
          </p>
          <Link
            href="/tasks"
            className="mt-4 inline-block rounded-lg bg-[var(--color-primary)] px-6 py-2 text-sm font-medium text-[var(--color-primary-foreground)]"
          >
            Browse Tasks
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {active.map((task) => {
            const Icon = HARNESS_ICONS[task.harnessType] ?? Wrench;
            return (
              <Link
                key={task.id}
                href={`/workspace/${task.taskId}`}
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 transition-shadow hover:shadow-md"
              >
                <div className="mb-3 flex items-center gap-2">
                  <Icon className="h-5 w-5 text-[var(--color-primary)]" />
                  <span className="rounded-full bg-[var(--color-muted)] px-2 py-0.5 text-xs capitalize">
                    {task.harnessType}
                  </span>
                </div>
                <h3 className="font-semibold">{task.title}</h3>
                <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                  {task.description?.slice(0, 80)}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
