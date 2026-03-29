import { NextResponse } from "next/server";
import { db } from "@8gent/db";
import { notificationPreferences } from "@8gent/db/schema";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";

const NOTIFICATION_TYPES = [
  "goal_nudge",
  "agent_finding",
  "stale_content",
  "system",
] as const;

const DEFAULTS: Record<
  string,
  { inApp: boolean; chat: boolean; email: boolean }
> = {
  goal_nudge: { inApp: true, chat: true, email: false },
  agent_finding: { inApp: true, chat: true, email: true },
  stale_content: { inApp: true, chat: false, email: false },
  system: { inApp: true, chat: false, email: true },
};

export async function GET() {
  const user = await requireUser();

  const saved = await db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, user.id));

  const savedMap = new Map(saved.map((s) => [s.type, s]));

  const prefs = NOTIFICATION_TYPES.map((type) => {
    const s = savedMap.get(type);
    return {
      type,
      inApp: s?.inApp ?? DEFAULTS[type].inApp,
      chat: s?.chat ?? DEFAULTS[type].chat,
      email: s?.email ?? DEFAULTS[type].email,
    };
  });

  return NextResponse.json(prefs);
}

export async function PUT(req: Request) {
  const user = await requireUser();
  const body: Array<{
    type: string;
    inApp: boolean;
    chat: boolean;
    email: boolean;
  }> = await req.json();

  if (!Array.isArray(body)) {
    return NextResponse.json({ error: "Expected array" }, { status: 400 });
  }

  await db
    .delete(notificationPreferences)
    .where(eq(notificationPreferences.userId, user.id));

  if (body.length > 0) {
    await db.insert(notificationPreferences).values(
      body
        .filter((p) =>
          NOTIFICATION_TYPES.includes(
            p.type as (typeof NOTIFICATION_TYPES)[number]
          )
        )
        .map((p) => ({
          userId: user.id,
          type: p.type as (typeof NOTIFICATION_TYPES)[number],
          inApp: p.inApp,
          chat: p.chat,
          email: p.email,
        }))
    );
  }

  return NextResponse.json({ ok: true });
}
