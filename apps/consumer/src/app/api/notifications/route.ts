import { NextResponse } from "next/server";
import { db } from "@8gent/db";
import { notifications } from "@8gent/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireUser } from "@/lib/auth";

export async function GET() {
  const user = await requireUser();

  const items = await db
    .select()
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, user.id),
        eq(notifications.dismissed, false)
      )
    )
    .orderBy(desc(notifications.createdAt))
    .limit(50);

  return NextResponse.json(items);
}
