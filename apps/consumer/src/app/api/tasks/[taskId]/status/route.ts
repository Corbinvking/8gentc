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
    const status = await platformCClient.tasks.getStatus(taskId);
    return NextResponse.json(status);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("404")) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    return NextResponse.json(
      {
        error: "Engine unavailable",
        fallback: {
          taskId,
          status: "unknown",
          milestones: [],
          updatedAt: new Date().toISOString(),
        },
      },
      { status: 502 }
    );
  }
}
