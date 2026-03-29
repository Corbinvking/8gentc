import { db } from "@8gent/db";
import { subscriptions, llmCalls, usageRecords } from "@8gent/db";
import { sql, eq, gte } from "drizzle-orm";

function Card({ title, value, subtitle }: { title: string; value: string; subtitle?: string }) {
  return (
    <div className="p-6 rounded-lg border border-gray-800 bg-gray-900">
      <p className="text-sm text-gray-400 mb-1">{title}</p>
      <p className="text-3xl font-bold">{value}</p>
      {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
}

export default async function FinancialsPage() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [subStats] = await db
    .select({
      total: sql<number>`count(*)::int`,
      active: sql<number>`count(*) filter (where status = 'active')::int`,
    })
    .from(subscriptions);

  const [llmStats] = await db
    .select({
      totalCost: sql<number>`coalesce(sum(cost::numeric), 0)::float`,
      totalCalls: sql<number>`count(*)::int`,
    })
    .from(llmCalls)
    .where(gte(llmCalls.timestamp, monthStart));

  const costByProvider = await db
    .select({
      provider: llmCalls.provider,
      cost: sql<number>`sum(cost::numeric)::float`,
      calls: sql<number>`count(*)::int`,
    })
    .from(llmCalls)
    .where(gte(llmCalls.timestamp, monthStart))
    .groupBy(llmCalls.provider);

  const costByModel = await db
    .select({
      model: llmCalls.model,
      cost: sql<number>`sum(cost::numeric)::float`,
      calls: sql<number>`count(*)::int`,
    })
    .from(llmCalls)
    .where(gte(llmCalls.timestamp, monthStart))
    .groupBy(llmCalls.model);

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Financial Metrics</h1>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card title="Active Subscriptions" value={String(subStats?.active ?? 0)} />
          <Card title="LLM Cost (this month)" value={`$${(llmStats?.totalCost ?? 0).toFixed(2)}`} />
          <Card title="LLM Calls (this month)" value={String(llmStats?.totalCalls ?? 0)} />
          <Card
            title="Avg Cost per Call"
            value={`$${llmStats?.totalCalls ? ((llmStats.totalCost ?? 0) / llmStats.totalCalls).toFixed(4) : "0"}`}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-lg border border-gray-800 bg-gray-900">
            <h3 className="text-lg font-semibold mb-4">Cost by Provider</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-gray-800">
                  <th className="text-left py-2">Provider</th>
                  <th className="text-right py-2">Calls</th>
                  <th className="text-right py-2">Cost</th>
                </tr>
              </thead>
              <tbody>
                {costByProvider.map((p) => (
                  <tr key={p.provider} className="border-b border-gray-800">
                    <td className="py-2 capitalize">{p.provider}</td>
                    <td className="text-right py-2">{p.calls}</td>
                    <td className="text-right py-2">${(p.cost ?? 0).toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-6 rounded-lg border border-gray-800 bg-gray-900">
            <h3 className="text-lg font-semibold mb-4">Cost by Model</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-gray-800">
                  <th className="text-left py-2">Model</th>
                  <th className="text-right py-2">Calls</th>
                  <th className="text-right py-2">Cost</th>
                </tr>
              </thead>
              <tbody>
                {costByModel.map((m) => (
                  <tr key={m.model} className="border-b border-gray-800">
                    <td className="py-2 font-mono text-xs">{m.model}</td>
                    <td className="text-right py-2">{m.calls}</td>
                    <td className="text-right py-2">${(m.cost ?? 0).toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
