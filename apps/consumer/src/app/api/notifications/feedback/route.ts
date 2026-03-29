import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { platformCClient } from "@8gent/api-client/platform-c";

export async function POST(req: Request) {
  await requireUser();
  const { notificationId, helpful } = await req.json();

  try {
    await platformCClient.understanding.submitFeedback({
      notificationId,
      helpful,
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to submit feedback" }, { status: 500 });
  }
}
