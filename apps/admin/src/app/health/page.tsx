import { getEngineHealth, getGatewayHealth, getAgentHostHealth, getProviderHealth, getAgentHostMetrics } from "../lib/api";

function StatusBadge({ ok }: { ok: boolean }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${ok ? "bg-green-900 text-green-300" : "bg-red-900 text-red-300"}`}>
      {ok ? "Healthy" : "Down"}
    </span>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-6 rounded-lg border border-gray-800 bg-gray-900">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      {children}
    </div>
  );
}

export default async function HealthPage() {
  let engineHealth, gatewayHealth, agentHostHealth, providerHealth, agentMetrics;

  try {
    [engineHealth, gatewayHealth, agentHostHealth, providerHealth, agentMetrics] = await Promise.all([
      getEngineHealth().catch(() => null),
      getGatewayHealth().catch(() => null),
      getAgentHostHealth().catch(() => null),
      getProviderHealth().catch(() => []),
      getAgentHostMetrics().catch(() => null),
    ]);
  } catch {
    engineHealth = null;
    gatewayHealth = null;
    agentHostHealth = null;
    providerHealth = [];
    agentMetrics = null;
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Platform Health</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card title="Engine API">
            <StatusBadge ok={engineHealth?.status === "ok"} />
            <p className="text-gray-400 text-sm mt-2">Core orchestration service</p>
          </Card>

          <Card title="LLM Gateway">
            <StatusBadge ok={gatewayHealth?.status === "ok"} />
            {gatewayHealth?.cacheStats && (
              <div className="mt-3 text-sm text-gray-400">
                <p>Cache hit rate: {(gatewayHealth.cacheStats.hitRate * 100).toFixed(1)}%</p>
                <p>Hits: {gatewayHealth.cacheStats.hits} / Misses: {gatewayHealth.cacheStats.misses}</p>
              </div>
            )}
          </Card>

          <Card title="Agent Host">
            <StatusBadge ok={agentHostHealth?.status === "ok"} />
            {agentHostHealth && (
              <div className="mt-3 text-sm text-gray-400">
                <p>Containers: {agentHostHealth.running} running / {agentHostHealth.containers} total</p>
              </div>
            )}
          </Card>
        </div>

        <Card title="LLM Providers">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.isArray(providerHealth) && providerHealth.map((p) => (
              <div key={p.name} className="p-4 rounded border border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium capitalize">{p.name}</span>
                  <StatusBadge ok={p.health?.available ?? false} />
                </div>
                {p.health && (
                  <div className="text-sm text-gray-400">
                    <p>Latency: {p.health.latencyMs}ms</p>
                    <p>Error rate: {(p.health.errorRate * 100).toFixed(1)}%</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>

        {agentMetrics && (
          <div className="mt-6">
            <Card title="Container Metrics">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold">{agentMetrics.totalContainers}</p>
                  <p className="text-sm text-gray-400">Total Containers</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{agentMetrics.runningContainers}</p>
                  <p className="text-sm text-gray-400">Running</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{agentMetrics.averageCpuPercent.toFixed(1)}%</p>
                  <p className="text-sm text-gray-400">Avg CPU</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{agentMetrics.averageMemoryPercent.toFixed(1)}%</p>
                  <p className="text-sm text-gray-400">Avg Memory</p>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </main>
  );
}
