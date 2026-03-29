import { NextRequest, NextResponse } from "next/server";
import { db } from "@8gent/db/client";
import { contractors, taskOffers, deliverables } from "@8gent/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { nanoid } from "nanoid";
import { validateServiceAuth } from "@/lib/s2s-auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = validateServiceAuth(req);
  if (authError) return authError;

  const { id } = await params;
  const body = await req.json();
  const { type, title, message, metadata } = body;

  const [contractor] = await db
    .select()
    .from(contractors)
    .where(eq(contractors.id, id))
    .limit(1);

  if (!contractor) {
    return NextResponse.json({ error: "Contractor not found" }, { status: 404 });
  }

  if (type === "revision_request" && metadata?.taskId) {
    const taskId = metadata.taskId as string;
    const revisionNotes = metadata.revisionNotes as string | undefined;

    const [latestDeliverable] = await db
      .select()
      .from(deliverables)
      .where(and(eq(deliverables.taskId, taskId), eq(deliverables.contractorId, id)))
      .orderBy(desc(deliverables.submittedAt))
      .limit(1);

    if (latestDeliverable && latestDeliverable.revisionNumber < 2) {
      await db
        .update(deliverables)
        .set({ status: "revision_requested" })
        .where(eq(deliverables.id, latestDeliverable.id));
    }
  }

  // TODO: Push to WebSocket/SSE or notification queue for real-time display
  // For now, log the notification
  console.log(`[Notification] contractor=${id} type=${type} title="${title}" message="${message}"`);

  return NextResponse.json({ success: true });
}
