import { getContractorOrRedirect } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@8gent/db/client";
import { taskOffers, shifts } from "@8gent/db/schema";
import { eq, and, gte, count } from "drizzle-orm";
import { BarChart3, ListTodo, DollarSign, Trophy } from "lucide-react";

export default async function DashboardPage() {
  const contractor = await getContractorOrRedirect();

  if (!contractor) redirect("/sign-in");
  if (contractor.onboardingStatus !== "approved") redirect("/onboarding/status");

  const now = new Date();

  const [activeTaskCount] = await db
    .select({ value: count() })
    .from(taskOffers)
    .where(and(eq(taskOffers.contractorId, contractor.id), eq(taskOffers.status, "accepted")));

  const [upcomingShiftCount] = await db
    .select({ value: count() })
    .from(shifts)
    .where(and(eq(shifts.contractorId, contractor.id), gte(shifts.startTime, now), eq(shifts.status, "scheduled")));

  const stats = [
    {
      name: "Active Tasks",
      value: activeTaskCount?.value ?? 0,
      icon: ListTodo,
      href: "/tasks",
    },
    {
      name: "Composite Score",
      value: contractor.compositeScore ? Number(contractor.compositeScore).toFixed(1) : "—",
      icon: BarChart3,
      href: "/performance",
    },
    {
      name: "XP",
      value: contractor.xp.toLocaleString(),
      icon: Trophy,
      href: "/leaderboard",
    },
    {
      name: "Tasks Completed",
      value: contractor.completedTasks ?? 0,
      icon: DollarSign,
      href: "/earnings",
    },
  ];

  const tierLabels: Record<string, string> = {
    new: "Tier 1 — New",
    established: "Tier 2 — Established",
    expert: "Tier 3 — Expert",
    elite: "Tier 4 — Elite",
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Welcome back, {contractor.displayName}</h1>
        <p className="text-[var(--color-muted-foreground)]">
          {tierLabels[contractor.tier] ?? contractor.tier} · {contractor.currentStreak} task streak ·{" "}
          {upcomingShiftCount?.value ?? 0} upcoming shifts
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <a
            key={stat.name}
            href={stat.href}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 transition-shadow hover:shadow-md"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-[var(--color-muted)] p-2">
                <stat.icon className="h-5 w-5 text-[var(--color-primary)]" />
              </div>
              <div>
                <p className="text-sm text-[var(--color-muted-foreground)]">{stat.name}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
