import { NextResponse } from "next/server";
import { db } from "@8gent/db";
import {
  notifications,
  notificationPreferences,
  users,
} from "@8gent/db/schema";
import { eq, and, gte, sql } from "drizzle-orm";
import { sendDigestEmail } from "@/lib/email";

export const maxDuration = 60;

export async function GET(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const period = (url.searchParams.get("period") ?? "daily") as
    | "daily"
    | "weekly";

  const since = new Date();
  if (period === "daily") {
    since.setDate(since.getDate() - 1);
  } else {
    since.setDate(since.getDate() - 7);
  }

  const usersWithEmailPref = await db
    .select({
      userId: notificationPreferences.userId,
    })
    .from(notificationPreferences)
    .where(eq(notificationPreferences.email, true))
    .groupBy(notificationPreferences.userId);

  let sent = 0;
  let failed = 0;

  for (const { userId } of usersWithEmailPref) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    if (!user?.email) continue;

    const recent = await db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          gte(notifications.createdAt, since)
        )
      )
      .orderBy(notifications.createdAt)
      .limit(50);

    if (recent.length === 0) continue;

    try {
      await sendDigestEmail(
        user.email,
        user.name ?? "there",
        recent.map((n) => ({
          type: n.type,
          title: n.title,
          body: n.body,
          createdAt: n.createdAt.toISOString(),
        })),
        period
      );
      sent++;
    } catch {
      failed++;
    }
  }

  return NextResponse.json({
    period,
    usersProcessed: usersWithEmailPref.length,
    sent,
    failed,
  });
}
