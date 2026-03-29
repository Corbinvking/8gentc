"use server";

import { db } from "@8gent/db/client";
import { contractors } from "@8gent/db/schema";
import { eq } from "drizzle-orm";
import { requireContractor } from "@/lib/auth";
import {
  createConnectAccount,
  createConnectOnboardingLink,
  createConnectDashboardLink,
  stripe,
} from "@/lib/stripe";

export async function setupPayoutAccount() {
  const contractor = await requireContractor();

  if (contractor.stripeConnectId) {
    const link = await createConnectOnboardingLink(contractor.stripeConnectId);
    return { onboardingUrl: link, alreadyExists: true };
  }

  const account = await createConnectAccount(
    "contractor@example.com",
    contractor.id
  );

  await db
    .update(contractors)
    .set({ stripeConnectId: account.id, updatedAt: new Date() })
    .where(eq(contractors.id, contractor.id));

  const link = await createConnectOnboardingLink(account.id);
  return { onboardingUrl: link, alreadyExists: false };
}

export async function getPayoutAccountStatus() {
  const contractor = await requireContractor();

  if (!contractor.stripeConnectId) {
    return { hasAccount: false, status: "none" as const };
  }

  try {
    const account = await stripe.accounts.retrieve(contractor.stripeConnectId);
    const isComplete =
      account.details_submitted && account.charges_enabled && account.payouts_enabled;
    return {
      hasAccount: true,
      status: isComplete ? ("active" as const) : ("incomplete" as const),
      chargesEnabled: account.charges_enabled ?? false,
      payoutsEnabled: account.payouts_enabled ?? false,
      detailsSubmitted: account.details_submitted ?? false,
    };
  } catch {
    return { hasAccount: true, status: "error" as const };
  }
}

export async function getPayoutDashboardLink() {
  const contractor = await requireContractor();

  if (!contractor.stripeConnectId) {
    return { error: "No Stripe account found" };
  }

  const url = await createConnectDashboardLink(contractor.stripeConnectId);
  return { url };
}

export async function getPayoutOnboardingLink() {
  const contractor = await requireContractor();

  if (!contractor.stripeConnectId) {
    return { error: "No Stripe account found" };
  }

  const url = await createConnectOnboardingLink(contractor.stripeConnectId);
  return { url };
}
