import { NextRequest, NextResponse } from "next/server";
import { db } from "@8gent/db/client";
import { taskOffers, contractors } from "@8gent/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { validateServiceAuth } from "@/lib/s2s-auth";

export async function POST(req: NextRequest) {
  const authError = validateServiceAuth(req);
  if (authError) return authError;

  const body = await req.json();

  const {
    contractorId,
    taskId,
    title,
    description,
    category,
    complexity,
    harnessType,
    estimatedDuration,
    payoutMin,
    payoutMax,
    deadline,
    clientContextSummary,
    expiresAt,
  } = body;

  if (!contractorId || !taskId) {
    return NextResponse.json({ error: "contractorId and taskId are required" }, { status: 400 });
  }

  const [contractor] = await db
    .select()
    .from(contractors)
    .where(eq(contractors.id, contractorId))
    .limit(1);

  if (!contractor || contractor.status !== "active") {
    return NextResponse.json({ error: "Contractor not found or not active" }, { status: 404 });
  }

  const offerId = nanoid();
  const offerExpiresAt = expiresAt
    ? new Date(expiresAt)
    : new Date(Date.now() + 15 * 60 * 1000);

  await db.insert(taskOffers).values({
    id: offerId,
    taskId,
    contractorId,
    title: title ?? "Untitled Task",
    description,
    category: category ?? "development",
    complexity: complexity ?? 3,
    harnessType: harnessType ?? "coding",
    estimatedDuration,
    payoutMin: payoutMin ? String(payoutMin) : undefined,
    payoutMax: payoutMax ? String(payoutMax) : undefined,
    deadline: deadline ? new Date(deadline) : undefined,
    clientContextSummary,
    status: "pending",
    offeredAt: new Date(),
    expiresAt: offerExpiresAt,
  });

  return NextResponse.json({ offerId, expiresAt: offerExpiresAt.toISOString() });
}
