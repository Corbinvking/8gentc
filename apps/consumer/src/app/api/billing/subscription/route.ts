import { NextResponse } from "next/server";
import { db } from "@8gent/db";
import { subscriptions, users } from "@8gent/db/schema";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";

export async function GET() {
  const user = await requireUser();

  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.userId, user.id),
  });

  if (!sub) {
    return NextResponse.json({
      id: null,
      plan: user.plan ?? "free",
      status: "active",
      currentPeriodEnd: null,
      stripeCustomerId: null,
    });
  }

  return NextResponse.json(sub);
}
