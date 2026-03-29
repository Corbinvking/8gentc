"use client";

import { Rocket, X, ArrowRight } from "lucide-react";
import { useState } from "react";
import { useCreateCheckoutSession } from "@/hooks/use-billing";
import { toast } from "sonner";

interface UpgradePromptProps {
  reason: string;
  suggestedPlan: string;
  limitations: string[];
  contractorCapabilities: string[];
  estimatedCost?: string;
}

export function UpgradePrompt({
  reason,
  suggestedPlan,
  limitations,
  contractorCapabilities,
  estimatedCost,
}: UpgradePromptProps) {
  const [dismissed, setDismissed] = useState(false);
  const createCheckout = useCreateCheckoutSession();

  if (dismissed) return null;

  const handleUpgrade = async () => {
    if (suggestedPlan === "enterprise") {
      window.open(
        "mailto:sales@8gentc.com?subject=Enterprise%20Upgrade",
        "_blank"
      );
      return;
    }
    try {
      const { url } = await createCheckout.mutateAsync(suggestedPlan);
      window.location.href = url;
    } catch {
      toast.error("Failed to start checkout");
    }
  };

  return (
    <div className="relative rounded-lg border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/50 dark:bg-amber-950/20">
      <button
        onClick={() => setDismissed(true)}
        className="absolute right-3 top-3 text-amber-400 hover:text-amber-600"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-3">
        <Rocket className="mt-0.5 h-5 w-5 text-amber-500" />
        <div className="flex-1">
          <h3 className="font-semibold text-amber-900 dark:text-amber-200">
            This task needs more power
          </h3>
          <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">
            {reason}
          </p>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="text-xs font-medium uppercase text-amber-600 dark:text-amber-500">
                What agents can&apos;t do here
              </h4>
              <ul className="mt-1 space-y-1 text-sm text-amber-700 dark:text-amber-400">
                {limitations.map((l) => (
                  <li key={l}>• {l}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-medium uppercase text-amber-600 dark:text-amber-500">
                What the contractor fleet would do
              </h4>
              <ul className="mt-1 space-y-1 text-sm text-amber-700 dark:text-amber-400">
                {contractorCapabilities.map((c) => (
                  <li key={c}>• {c}</li>
                ))}
              </ul>
            </div>
          </div>

          {estimatedCost && (
            <p className="mt-3 text-sm text-amber-600 dark:text-amber-500">
              Estimated cost: {estimatedCost}
            </p>
          )}

          <div className="mt-4 flex gap-2">
            <button
              onClick={handleUpgrade}
              className="inline-flex items-center gap-1.5 rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500"
            >
              Upgrade to {suggestedPlan}
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={() =>
                window.open(
                  "mailto:sales@8gentc.com?subject=Enterprise%20Inquiry",
                  "_blank"
                )
              }
              className="rounded-md border border-amber-300 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-950"
            >
              Talk to us
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
