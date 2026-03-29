import { NextRequest, NextResponse } from "next/server";
import { validateServiceAuth } from "@/lib/s2s-auth";
import { db } from "@8gent/db/client";
import { payoutDisputes, contractors } from "@8gent/db/schema";
import { eq, sql } from "drizzle-orm";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = validateServiceAuth(req);
  if (authError) return authError;

  const { id } = await params;

  const body = await req.json();
  const { resolution, adminNotes, adjustedScore, adjustedPayout } = body as {
    resolution: string;
    adminNotes?: string;
    adjustedScore?: number;
    adjustedPayout?: number;
  };

  if (!resolution) {
    return NextResponse.json({ error: "resolution is required" }, { status: 400 });
  }

  const [dispute] = await db
    .select()
    .from(payoutDisputes)
    .where(eq(payoutDisputes.id, id))
    .limit(1);

  if (!dispute) {
    return NextResponse.json({ error: "Dispute not found" }, { status: 404 });
  }

  if (dispute.status === "resolved") {
    return NextResponse.json({ error: "Dispute already resolved" }, { status: 409 });
  }

  await db
    .update(payoutDisputes)
    .set({
      status: "resolved",
      resolution,
      adminNotes: adminNotes ?? null,
      resolvedAt: new Date(),
    })
    .where(eq(payoutDisputes.id, id));

  if (adjustedScore !== undefined && dispute.contractorId) {
    await db
      .update(contractors)
      .set({
        compositeScore: String(adjustedScore),
        updatedAt: new Date(),
      })
      .where(eq(contractors.id, dispute.contractorId));
  }

  return NextResponse.json({
    success: true,
    disputeId: id,
    resolution,
    adjustedScore: adjustedScore ?? null,
    adjustedPayout: adjustedPayout ?? null,
  });
}
