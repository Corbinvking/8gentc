import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-03-31.basil" as Stripe.LatestApiVersion,
});

export async function createConnectAccount(email: string, contractorId: string) {
  const account = await stripe.accounts.create({
    type: "express",
    email,
    metadata: { contractorId },
    capabilities: {
      transfers: { requested: true },
    },
  });
  return account;
}

export async function createConnectOnboardingLink(accountId: string) {
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${process.env.NEXT_PUBLIC_CONTRACTOR_URL}/settings/payments?refresh=true`,
    return_url: `${process.env.NEXT_PUBLIC_CONTRACTOR_URL}/settings/payments?success=true`,
    type: "account_onboarding",
  });
  return accountLink.url;
}

export async function createConnectDashboardLink(accountId: string) {
  const loginLink = await stripe.accounts.createLoginLink(accountId);
  return loginLink.url;
}

export async function createTransfer(
  amount: number,
  destinationAccountId: string,
  metadata: Record<string, string>
) {
  const transfer = await stripe.transfers.create({
    amount: Math.round(amount * 100),
    currency: "usd",
    destination: destinationAccountId,
    metadata,
  });
  return transfer;
}
