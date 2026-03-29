import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { platformCClient } from "@8gent/api-client/platform-c";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  await requireUser();
  const { agentId } = await params;
  const url = new URL(req.url);
  const limit = Number(url.searchParams.get("limit") ?? 20);
  const offset = Number(url.searchParams.get("offset") ?? 0);

  try {
    const outputs = await platformCClient.agents.getOutputs(agentId, {
      limit,
      offset,
    });
    return NextResponse.json(outputs);
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Failed to fetch agent outputs";
    return NextResponse.json({ error: msg, outputs: [] }, { status: 502 });
  }
}
