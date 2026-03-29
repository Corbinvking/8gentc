import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { platformCClient } from "@8gent/api-client/platform-c";

export async function POST(req: Request) {
  await requireUser();
  const { notificationId, helpful } = await req.json();

  if (!notificationId || helpful === undefined) {
    return NextResponse.json(
      { error: "notificationId and helpful are required" },
      { status: 400 }
    );
  }

  try {
    await platformCClient.understanding.submitFeedback({
      notificationId,
      helpful,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("API error")) {
      return NextResponse.json(
        { error: "Engine unavailable — feedback saved for retry", ok: false },
        { status: 202 }
      );
    }
    return NextResponse.json(
      { error: "Failed to submit feedback" },
      { status: 500 }
    );
  }
}
