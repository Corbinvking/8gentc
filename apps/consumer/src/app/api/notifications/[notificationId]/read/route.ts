import { NextResponse } from "next/server";
import { db } from "@8gent/db";
import { notifications } from "@8gent/db/schema";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ notificationId: string }> }
) {
  await requireUser();
  const { notificationId } = await params;

  await db
    .update(notifications)
    .set({ read: true })
    .where(eq(notifications.id, notificationId));

  return NextResponse.json({ ok: true });
}
