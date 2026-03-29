"use client";

import { useQuery, useMutation } from "@tanstack/react-query";

export interface Subscription {
  id: string;
  plan: string;
  status: string;
  currentPeriodEnd: string | null;
  stripeCustomerId: string;
}

export interface UsageData {
  runtimeHoursUsed: number;
  runtimeHoursLimit: number;
  tokensByAgent: Array<{ agentId: string; agentName: string; tokens: number }>;
  projectedUsage: number;
  billingPeriodEnd: string;
}

export function useSubscription() {
  return useQuery({
    queryKey: ["subscription"],
    queryFn: async () => {
      const res = await fetch("/api/billing/subscription");
      if (!res.ok) throw new Error("Failed to fetch subscription");
      return res.json() as Promise<Subscription>;
    },
  });
}

export function useUsage() {
  return useQuery({
    queryKey: ["usage"],
    queryFn: async () => {
      const res = await fetch("/api/billing/usage");
      if (!res.ok) throw new Error("Failed to fetch usage");
      return res.json() as Promise<UsageData>;
    },
  });
}

export function useCreateCheckoutSession() {
  return useMutation({
    mutationFn: async (planId: string) => {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      if (!res.ok) throw new Error("Failed to create checkout session");
      return res.json() as Promise<{ url: string }>;
    },
  });
}

export function useCreatePortalSession() {
  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      if (!res.ok) throw new Error("Failed to create portal session");
      return res.json() as Promise<{ url: string }>;
    },
  });
}
