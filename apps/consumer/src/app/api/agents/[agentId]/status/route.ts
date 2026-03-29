import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { platformCClient } from "@8gent/api-client/platform-c";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  await requireUser();
  const { agentId } = await params;

  try {
    const status = await platformCClient.agents.getStatus(agentId);
    return NextResponse.json(status);
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Failed to fetch agent status";
    if (msg.includes("404")) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }
    return NextResponse.json(
      {
        error: "Engine unavailable",
        fallback: {
          status: "unknown",
          lastRunAt: null,
          nextRunAt: null,
          runsThisPeriod: 0,
          tokensThisPeriod: 0,
        },
      },
      { status: 502 }
    );
  }
}
