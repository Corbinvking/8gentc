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
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
