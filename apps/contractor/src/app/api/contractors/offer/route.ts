import { NextRequest, NextResponse } from "next/server";
import { db } from "@8gent/db/client";
import { taskOffers } from "@8gent/db/schema";
import { nanoid } from "nanoid";

export async function POST(req: NextRequest) {
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

  const offerId = nanoid();
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
    expiresAt: expiresAt ? new Date(expiresAt) : new Date(Date.now() + 15 * 60 * 1000),
  });

  return NextResponse.json({ offerId });
}
