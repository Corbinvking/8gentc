import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { platformCClient } from "@8gent/api-client/platform-c";

type RouteContext = { params: Promise<{ agentId: string }> };

export async function GET(_req: Request, { params }: RouteContext) {
  const user = await requireUser();
  const { agentId } = await params;

  try {
    const [agents, status] = await Promise.all([
      platformCClient.agents.list({ userId: user.id }),
      platformCClient.agents.getStatus(agentId).catch(() => null),
    ]);
    const agent = agents.find((a) => a.id === agentId);
    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }
    return NextResponse.json({ ...agent, runtimeStatus: status });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to fetch agent";
    const status = msg.includes("API error") ? 502 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function PATCH(req: Request, { params }: RouteContext) {
  await requireUser();
  const { agentId } = await params;
  const body = await req.json();

  const { name, skills, config } = body;

  try {
    const agent = await platformCClient.agents.update(agentId, {
      name,
      skills,
      config,
    });
    return NextResponse.json(agent);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to update agent";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  await requireUser();
  const { agentId } = await params;

  try {
    await platformCClient.agents.delete(agentId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to delete agent";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
