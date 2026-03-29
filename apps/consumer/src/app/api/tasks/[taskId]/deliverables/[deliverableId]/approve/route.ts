import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { platformCClient } from "@8gent/api-client/platform-c";

type RouteContext = {
  params: Promise<{ taskId: string; deliverableId: string }>;
};

export async function POST(_req: Request, { params }: RouteContext) {
  await requireUser();
  const { taskId, deliverableId } = await params;

  try {
    const result = await platformCClient.tasks.approveDeliverable(
      taskId,
      deliverableId
    );
    return NextResponse.json(result);
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Failed to approve deliverable";
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
