import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Bot, FileText, MessageSquare, Zap, Shield, BarChart3, ArrowRight, Check } from "lucide-react";

export default async function LandingPage() {
  const { userId } = await auth();
  if (userId) redirect("/(dashboard)");

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      {/* Nav */}
      <header className="border-b border-zinc-100 dark:border-zinc-900">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <span className="text-xl font-bold tracking-tight">8gent</span>
          <div className="flex items-center gap-4">
            <Link
              href="/sign-in"
              className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 py-24 text-center">
        <h1 className="text-5xl font-bold tracking-tight md:text-6xl">
          Your AI workforce,
          <br />
          <span className="text-zinc-400">always on.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-zinc-500">
          8gent is a knowledge workspace powered by an AI agent swarm that works
          on your behalf 24/7. From client acquisition to research to entire
          development teams — the interface is identical, only the execution
          layer changes.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Link
            href="/sign-up"
            className="inline-flex items-center gap-2 rounded-md bg-zinc-900 px-6 py-3 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            Start Free
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="#features"
            className="rounded-md border border-zinc-200 px-6 py-3 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
          >
            Learn More
          </Link>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-zinc-100 bg-zinc-50 py-24 dark:border-zinc-900 dark:bg-zinc-900/50">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight">
            Everything you need to build with AI
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-zinc-500">
            A complete platform for capturing intent, orchestrating agents, and
            scaling from solo to enterprise.
          </p>

          <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: FileText,
                title: "Knowledge Workspace",
                description:
                  "Obsidian-style note graph with bidirectional links. Your knowledge base that agents can read and write to.",
              },
              {
                icon: MessageSquare,
                title: "AI Chat Interface",
                description:
                  "Conversational interface that understands your context. Chat-to-note conversion and slash commands.",
              },
              {
                icon: Bot,
                title: "Agent Dashboard",
                description:
                  "Monitor, configure, and control your agent fleet. See outputs, track performance, and adjust in real time.",
              },
              {
                icon: Zap,
                title: "Understanding Engine",
                description:
                  "Proactive AI that surfaces insights, nudges goals, and suggests actions before you ask.",
              },
              {
                icon: BarChart3,
                title: "Usage & Billing",
                description:
                  "Transparent usage tracking, predictable pricing, and seamless Stripe-powered subscription management.",
              },
              {
                icon: Shield,
                title: "Enterprise Ready",
                description:
                  "Automatic ambition detection escalates complex tasks to the human contractor fleet when agents aren't enough.",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <feature.icon className="h-8 w-8 text-zinc-600 dark:text-zinc-400" />
                <h3 className="mt-4 text-lg font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm text-zinc-500">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight">
            Simple, transparent pricing
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-zinc-500">
            Start free. Scale as you grow. No surprises.
          </p>

          <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                name: "Free",
                price: "$0",
                features: ["50 notes", "1 agent", "100 runs/month"],
              },
              {
                name: "Individual",
                price: "$29/mo",
                popular: true,
                features: [
                  "Unlimited notes",
                  "5 agents",
                  "10 runtime hours",
                ],
              },
              {
                name: "Pro",
                price: "$79/mo",
                features: [
                  "Unlimited notes",
                  "20 agents",
                  "50 runtime hours",
                  "API access",
                ],
              },
              {
                name: "Enterprise",
                price: "Custom",
                features: [
                  "Everything in Pro",
                  "Contractor fleet",
                  "Custom integrations",
                  "SLA guarantee",
                ],
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-lg border p-6 ${
                  plan.popular
                    ? "border-zinc-900 dark:border-zinc-100"
                    : "border-zinc-200 dark:border-zinc-800"
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-4 rounded-full bg-zinc-900 px-3 py-0.5 text-xs font-medium text-white dark:bg-zinc-100 dark:text-zinc-900">
                    Popular
                  </span>
                )}
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                <p className="mt-2 text-3xl font-bold">{plan.price}</p>
                <ul className="mt-4 space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/sign-up"
                  className="mt-6 block w-full rounded-md bg-zinc-100 py-2 text-center text-sm font-medium hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                >
                  Get Started
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-100 py-12 dark:border-zinc-900">
        <div className="mx-auto max-w-6xl px-6 text-center text-sm text-zinc-400">
          <p>&copy; {new Date().getFullYear()} 8gent. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
