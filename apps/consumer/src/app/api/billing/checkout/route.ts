import { NextResponse } from "next/server";
import Stripe from "stripe";
import { requireUser } from "@/lib/auth";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia",
});

const PRICE_IDS: Record<string, string> = {
  individual: process.env.STRIPE_PRICE_INDIVIDUAL ?? "price_individual",
  pro: process.env.STRIPE_PRICE_PRO ?? "price_pro",
};

export async function POST(req: Request) {
  const user = await requireUser();
  const { planId } = await req.json();

  const priceId = PRICE_IDS[planId];
  if (!priceId) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_CONSUMER_URL}/settings/billing?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_CONSUMER_URL}/settings/billing?canceled=true`,
    metadata: {
      userId: user.id,
      plan: planId,
    },
  });

  return NextResponse.json({ url: session.url });
}
