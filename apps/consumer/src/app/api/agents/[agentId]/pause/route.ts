import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { platformCClient } from "@8gent/api-client/platform-c";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  await requireUser();
  const { agentId } = await params;

  try {
    const agent = await platformCClient.agents.pause(agentId);
    return NextResponse.json(agent);
  } catch {
    return NextResponse.json({ error: "Failed to pause" }, { status: 500 });
  }
}
