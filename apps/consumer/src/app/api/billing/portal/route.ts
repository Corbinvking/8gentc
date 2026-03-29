import { NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@8gent/db";
import { subscriptions } from "@8gent/db/schema";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia",
});

export async function POST() {
  const user = await requireUser();

  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.userId, user.id),
  });

  if (!sub?.stripeCustomerId) {
    return NextResponse.json(
      { error: "No active subscription" },
      { status: 400 }
    );
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: sub.stripeCustomerId,
    return_url: `${process.env.NEXT_PUBLIC_CONSUMER_URL}/settings/billing`,
  });

  return NextResponse.json({ url: session.url });
}
