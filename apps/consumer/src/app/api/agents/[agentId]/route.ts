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
    const agents = await platformCClient.agents.list();
    const agent = agents.find((a) => a.id === agentId);
    if (!agent) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(agent);
  } catch {
    return NextResponse.json({ error: "Failed to fetch agent" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  await requireUser();
  const { agentId } = await params;
  const body = await req.json();

  try {
    const agent = await platformCClient.agents.update(agentId, body);
    return NextResponse.json(agent);
  } catch {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  await requireUser();
  const { agentId } = await params;

  try {
    await platformCClient.agents.delete(agentId);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
