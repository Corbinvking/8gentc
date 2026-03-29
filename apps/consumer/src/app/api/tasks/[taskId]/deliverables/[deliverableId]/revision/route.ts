import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { platformCClient } from "@8gent/api-client/platform-c";

type RouteContext = {
  params: Promise<{ taskId: string; deliverableId: string }>;
};

export async function POST(req: Request, { params }: RouteContext) {
  await requireUser();
  const { taskId, deliverableId } = await params;
  const { reason } = await req.json();

  if (!reason?.trim()) {
    return NextResponse.json(
      { error: "reason is required" },
      { status: 400 }
    );
  }

  try {
    const result = await platformCClient.tasks.requestRevision(
      taskId,
      deliverableId,
      reason
    );
    return NextResponse.json(result);
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Failed to request revision";
    if (msg.includes("404")) {
      return NextResponse.json(
        { error: "Deliverable not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: "Engine unavailable" },
      { status: 502 }
    );
  }
}
