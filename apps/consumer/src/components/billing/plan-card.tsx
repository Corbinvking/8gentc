"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface PlanCardProps {
  plan: {
    id: string;
    name: string;
    price: string;
    period: string;
    features: string[];
    popular?: boolean;
  };
  currentPlan: string;
  onSelect: () => void;
}

export function PlanCard({ plan, currentPlan, onSelect }: PlanCardProps) {
  const isCurrent = currentPlan === plan.id;

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-lg border p-5",
        plan.popular
          ? "border-zinc-900 dark:border-zinc-100"
          : "border-zinc-200 dark:border-zinc-800"
      )}
    >
      {plan.popular && (
        <span className="absolute -top-3 left-4 rounded-full bg-zinc-900 px-3 py-0.5 text-xs font-medium text-white dark:bg-zinc-100 dark:text-zinc-900">
          Popular
        </span>
      )}

      <h3 className="text-lg font-semibold">{plan.name}</h3>
      <div className="mt-2">
        <span className="text-3xl font-bold">{plan.price}</span>
        <span className="text-sm text-zinc-500">{plan.period}</span>
      </div>

      <ul className="mt-4 flex-1 space-y-2">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-center gap-2 text-sm">
            <Check className="h-4 w-4 shrink-0 text-green-500" />
            {feature}
          </li>
        ))}
      </ul>

      <button
        onClick={onSelect}
        disabled={isCurrent}
        className={cn(
          "mt-6 w-full rounded-md px-4 py-2 text-sm font-medium transition-colors",
          isCurrent
            ? "bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500"
            : plan.popular
              ? "bg-zinc-900 text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
              : "border border-zinc-200 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
        )}
      >
        {isCurrent ? "Current Plan" : plan.id === "enterprise" ? "Contact Sales" : "Upgrade"}
      </button>
    </div>
  );
}
