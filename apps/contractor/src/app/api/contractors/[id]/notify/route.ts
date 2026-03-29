import { NextRequest, NextResponse } from "next/server";
import { db } from "@8gent/db/client";
import { contractors } from "@8gent/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  const [contractor] = await db
    .select()
    .from(contractors)
    .where(eq(contractors.id, id))
    .limit(1);

  if (!contractor) {
    return NextResponse.json({ error: "Contractor not found" }, { status: 404 });
  }

  // In production, this would push to a WebSocket/SSE connection or notification queue
  // For now, we acknowledge receipt
  console.log(`Notification for contractor ${id}:`, body);

  return NextResponse.json({ success: true });
}
