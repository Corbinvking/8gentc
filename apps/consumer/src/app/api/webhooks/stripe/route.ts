import { headers } from "next/headers";
import Stripe from "stripe";
import { db } from "@8gent/db";
import { subscriptions, users, notifications } from "@8gent/db/schema";
import { eq } from "drizzle-orm";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia",
});

async function syncUserPlan(userId: string, plan: string) {
  if (!userId) return;
  await db
    .update(users)
    .set({ plan, updatedAt: new Date() })
    .where(eq(users.id, userId));
}

export async function POST(req: Request) {
  const body = await req.text();
  const headerPayload = await headers();
  const sig = headerPayload.get("stripe-signature");

  if (!sig) {
    return new Response("Missing stripe-signature header", { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.subscription && session.customer) {
        const userId = session.metadata?.userId ?? "";
        const plan = session.metadata?.plan ?? "pro";
        const subId = session.subscription as string;

        const existing = await db.query.subscriptions.findFirst({
          where: eq(subscriptions.stripeSubscriptionId, subId),
        });

        if (existing) {
          await db
            .update(subscriptions)
            .set({
              plan,
              status: "active",
              updatedAt: new Date(),
            })
            .where(eq(subscriptions.stripeSubscriptionId, subId));
        } else {
          await db.insert(subscriptions).values({
            id: crypto.randomUUID(),
            userId,
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: subId,
            plan,
            status: "active",
          });
        }

        await syncUserPlan(userId, plan);
      }
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const row = await db.query.subscriptions.findFirst({
        where: eq(subscriptions.stripeSubscriptionId, sub.id),
      });

      if (row) {
        const newPlan =
          (sub.items.data[0]?.price?.lookup_key as string) ?? row.plan;

        await db
          .update(subscriptions)
          .set({
            status: sub.status,
            plan: newPlan,
            currentPeriodEnd: new Date(sub.current_period_end * 1000),
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.stripeSubscriptionId, sub.id));

        await syncUserPlan(row.userId, newPlan);
      }
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const row = await db.query.subscriptions.findFirst({
        where: eq(subscriptions.stripeSubscriptionId, sub.id),
      });

      await db
        .update(subscriptions)
        .set({
          status: "canceled",
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.stripeSubscriptionId, sub.id));

      if (row) {
        await syncUserPlan(row.userId, "free");
      }
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      if (invoice.subscription) {
        const row = await db.query.subscriptions.findFirst({
          where: eq(
            subscriptions.stripeSubscriptionId,
            invoice.subscription as string
          ),
        });

        await db
          .update(subscriptions)
          .set({
            status: "past_due",
            updatedAt: new Date(),
          })
          .where(
            eq(
              subscriptions.stripeSubscriptionId,
              invoice.subscription as string
            )
          );

        if (row?.userId) {
          await db.insert(notifications).values({
            id: crypto.randomUUID(),
            userId: row.userId,
            type: "system",
            title: "Payment failed",
            body: "Your most recent payment was unsuccessful. Please update your payment method to avoid service interruption.",
            read: false,
            dismissed: false,
            metadata: {
              invoiceId: invoice.id,
              subscriptionId: invoice.subscription,
            },
          });
        }
      }
      break;
    }
  }

  return new Response("OK", { status: 200 });
}
