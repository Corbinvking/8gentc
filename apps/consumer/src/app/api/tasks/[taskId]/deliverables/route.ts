import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { platformCClient } from "@8gent/api-client/platform-c";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  await requireUser();
  const { taskId } = await params;

  try {
    const deliverables = await platformCClient.tasks.getDeliverables(taskId);
    return NextResponse.json(deliverables);
  } catch {
    return NextResponse.json([]);
  }
}
