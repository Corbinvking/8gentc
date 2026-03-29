"use client";

import { useSubscription, useUsage, useCreatePortalSession, useCreateCheckoutSession } from "@/hooks/use-billing";
import { PlanCard } from "./plan-card";
import { UsageDashboard } from "./usage-dashboard";
import { toast } from "sonner";

const plans = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "forever",
    features: [
      "50 notes",
      "1 agent",
      "100 agent runs/month",
      "Community support",
    ],
  },
  {
    id: "individual",
    name: "Individual",
    price: "$29",
    period: "/month",
    features: [
      "Unlimited notes",
      "5 agents",
      "10 runtime hours/month",
      "Priority execution",
      "Email support",
    ],
    popular: true,
  },
  {
    id: "pro",
    name: "Pro",
    price: "$79",
    period: "/month",
    features: [
      "Unlimited notes",
      "20 agents",
      "50 runtime hours/month",
      "Priority execution",
      "API access",
      "Priority support",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "Custom",
    period: "",
    features: [
      "Everything in Pro",
      "Unlimited agents",
      "Contractor fleet access",
      "Custom integrations",
      "Dedicated support",
      "SLA guarantee",
    ],
  },
];

export function BillingPage() {
  const { data: subscription } = useSubscription();
  const { data: usage } = useUsage();
  const createPortal = useCreatePortalSession();
  const createCheckout = useCreateCheckoutSession();

  const handleUpgrade = async (planId: string) => {
    if (planId === "enterprise") {
      window.open("mailto:sales@8gentc.com?subject=Enterprise%20Inquiry", "_blank");
      return;
    }
    try {
      const { url } = await createCheckout.mutateAsync(planId);
      window.location.href = url;
    } catch {
      toast.error("Failed to start checkout");
    }
  };

  const handleManage = async () => {
    try {
      const { url } = await createPortal.mutateAsync();
      window.location.href = url;
    } catch {
      toast.error("Failed to open billing portal");
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Billing & Subscription
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Manage your plan and view usage
          </p>
        </div>
        {subscription && (
          <button
            onClick={handleManage}
            className="rounded-md border border-zinc-200 px-4 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Manage Subscription
          </button>
        )}
      </div>

      {usage && (
        <div className="mt-8">
          <UsageDashboard usage={usage} />
        </div>
      )}

      <div className="mt-8">
        <h2 className="mb-4 text-lg font-semibold">Plans</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              currentPlan={subscription?.plan ?? "free"}
              onSelect={() => handleUpgrade(plan.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
