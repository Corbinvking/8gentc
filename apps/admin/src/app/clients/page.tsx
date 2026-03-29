import { db } from "@8gent/db";
import { users, agents, subscriptions } from "@8gent/db";
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

export default async function ClientsPage() {
  const [userStats] = await db
    .select({
      total: sql<number>`count(*)::int`,
      free: sql<number>`count(*) filter (where plan = 'free')::int`,
      pro: sql<number>`count(*) filter (where plan = 'pro')::int`,
      enterprise: sql<number>`count(*) filter (where plan = 'enterprise')::int`,
    })
    .from(users);

  const [agentStats] = await db
    .select({
      total: sql<number>`count(*)::int`,
      running: sql<number>`count(*) filter (where status = 'running')::int`,
      idle: sql<number>`count(*) filter (where status = 'idle')::int`,
      paused: sql<number>`count(*) filter (where status = 'paused')::int`,
      error: sql<number>`count(*) filter (where status = 'error')::int`,
    })
    .from(agents);

  const avgAgentsPerUser = userStats?.total ? (agentStats?.total ?? 0) / userStats.total : 0;

  const topUsers = await db
    .select({
      userId: agents.ownerId,
      agentCount: sql<number>`count(*)::int`,
    })
    .from(agents)
    .groupBy(agents.ownerId)
    .orderBy(sql`count(*) desc`)
    .limit(10);

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Client Metrics</h1>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card title="Total Users" value={String(userStats?.total ?? 0)} />
          <Card title="Pro Users" value={String(userStats?.pro ?? 0)} />
          <Card title="Enterprise Users" value={String(userStats?.enterprise ?? 0)} />
          <Card title="Avg Agents/User" value={avgAgentsPerUser.toFixed(1)} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="p-6 rounded-lg border border-gray-800 bg-gray-900">
            <h3 className="text-lg font-semibold mb-4">Users by Plan</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Free</span>
                <span>{userStats?.free ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Pro</span>
                <span className="text-blue-400">{userStats?.pro ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Enterprise</span>
                <span className="text-purple-400">{userStats?.enterprise ?? 0}</span>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-lg border border-gray-800 bg-gray-900">
            <h3 className="text-lg font-semibold mb-4">Agent Status</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Running</span>
                <span className="text-green-400">{agentStats?.running ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Idle</span>
                <span>{agentStats?.idle ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Paused</span>
                <span className="text-yellow-400">{agentStats?.paused ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Error</span>
                <span className="text-red-400">{agentStats?.error ?? 0}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-lg border border-gray-800 bg-gray-900">
          <h3 className="text-lg font-semibold mb-4">Top Users by Agent Count</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 border-b border-gray-800">
                <th className="text-left py-2">User ID</th>
                <th className="text-right py-2">Agents</th>
              </tr>
            </thead>
            <tbody>
              {topUsers.map((u) => (
                <tr key={u.userId} className="border-b border-gray-800">
                  <td className="py-2 font-mono text-xs">{u.userId}</td>
                  <td className="text-right py-2">{u.agentCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
