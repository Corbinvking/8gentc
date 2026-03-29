import Link from "next/link";

const sections = [
  {
    title: "Platform Health",
    href: "/health",
    description: "Active agents, error rates, LLM gateway metrics, container utilization",
  },
  {
    title: "Financial Metrics",
    href: "/financials",
    description: "MRR, LLM cost by provider/model, margin analysis, contractor payouts",
  },
  {
    title: "Workforce",
    href: "/workforce",
    description: "Contractor pool stats, utilization, queue depth, quality scores",
  },
  {
    title: "Clients",
    href: "/clients",
    description: "Active users by tier, agent usage, churn indicators",
  },
];

export default function AdminHome() {
  return (
    <main className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">8gent Operations</h1>
        <p className="text-gray-400 mb-8">Internal dashboard for monitoring platform health, financials, and workforce.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sections.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="block p-6 rounded-lg border border-gray-800 bg-gray-900 hover:border-gray-600 transition-colors"
            >
              <h2 className="text-xl font-semibold mb-2">{s.title}</h2>
              <p className="text-gray-400 text-sm">{s.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
