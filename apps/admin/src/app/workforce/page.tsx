import { db } from "@8gent/db";
import { contractors, workstreams, dispatchOffers } from "@8gent/db";
import { sql, eq } from "drizzle-orm";

function Card({ title, value, subtitle }: { title: string; value: string; subtitle?: string }) {
  return (
    <div className="p-6 rounded-lg border border-gray-800 bg-gray-900">
      <p className="text-sm text-gray-400 mb-1">{title}</p>
      <p className="text-3xl font-bold">{value}</p>
      {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
}

export default async function WorkforcePage() {
  const [contractorStats] = await db
    .select({
      total: sql<number>`count(*)::int`,
      active: sql<number>`count(*) filter (where status = 'active')::int`,
      pending: sql<number>`count(*) filter (where status = 'pending')::int`,
      avgRating: sql<number>`avg(rating::numeric)::float`,
      totalCompleted: sql<number>`sum(completed_tasks)::int`,
    })
    .from(contractors);

  const [queueStats] = await db
    .select({
      pendingWorkstreams: sql<number>`count(*) filter (where status = 'pending')::int`,
      assignedWorkstreams: sql<number>`count(*) filter (where status = 'assigned')::int`,
      inProgress: sql<number>`count(*) filter (where status = 'in_progress')::int`,
    })
    .from(workstreams);

  const [offerStats] = await db
    .select({
      pendingOffers: sql<number>`count(*) filter (where status = 'pending')::int`,
      acceptedOffers: sql<number>`count(*) filter (where status = 'accepted')::int`,
      rejectedOffers: sql<number>`count(*) filter (where status = 'rejected')::int`,
    })
    .from(dispatchOffers);

  const topContractors = await db
    .select()
    .from(contractors)
    .where(eq(contractors.status, "active"))
    .orderBy(sql`rating::numeric desc`)
    .limit(10);

  const total = contractorStats?.total ?? 0;
  const active = contractorStats?.active ?? 0;
  const utilization = active > 0 ? ((queueStats?.inProgress ?? 0) / active * 100) : 0;

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Workforce Metrics</h1>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card title="Total Contractors" value={String(total)} subtitle={`${active} active, ${contractorStats?.pending ?? 0} pending`} />
          <Card title="Avg Rating" value={(contractorStats?.avgRating ?? 0).toFixed(2)} />
          <Card title="Utilization" value={`${utilization.toFixed(0)}%`} subtitle="Active contractors with tasks" />
          <Card title="Queue Depth" value={String(queueStats?.pendingWorkstreams ?? 0)} subtitle="Pending workstreams" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="p-6 rounded-lg border border-gray-800 bg-gray-900">
            <h3 className="text-lg font-semibold mb-4">Dispatch Pipeline</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Pending offers</span>
                <span>{offerStats?.pendingOffers ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Accepted</span>
                <span className="text-green-400">{offerStats?.acceptedOffers ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Rejected</span>
                <span className="text-red-400">{offerStats?.rejectedOffers ?? 0}</span>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-lg border border-gray-800 bg-gray-900">
            <h3 className="text-lg font-semibold mb-4">Workstream Status</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Pending</span>
                <span>{queueStats?.pendingWorkstreams ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Assigned</span>
                <span className="text-blue-400">{queueStats?.assignedWorkstreams ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">In progress</span>
                <span className="text-yellow-400">{queueStats?.inProgress ?? 0}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-lg border border-gray-800 bg-gray-900">
          <h3 className="text-lg font-semibold mb-4">Top Contractors</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 border-b border-gray-800">
                <th className="text-left py-2">Name</th>
                <th className="text-right py-2">Rating</th>
                <th className="text-right py-2">Completed</th>
                <th className="text-right py-2">Skills</th>
              </tr>
            </thead>
            <tbody>
              {topContractors.map((c) => (
                <tr key={c.id} className="border-b border-gray-800">
                  <td className="py-2">{c.displayName}</td>
                  <td className="text-right py-2">{parseFloat(c.rating?.toString() ?? "0").toFixed(2)}</td>
                  <td className="text-right py-2">{c.completedTasks}</td>
                  <td className="text-right py-2 text-xs text-gray-400">{((c.skills as string[]) ?? []).join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
