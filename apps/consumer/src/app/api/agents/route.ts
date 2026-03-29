import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { platformCClient } from "@8gent/api-client/platform-c";

export async function GET(req: Request) {
  const user = await requireUser();
  const url = new URL(req.url);
  const workspaceId = url.searchParams.get("workspaceId") ?? undefined;

  try {
    const agents = await platformCClient.agents.list({
      userId: user.id,
      workspaceId,
    });
    return NextResponse.json(agents);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("API error")) {
      return NextResponse.json(
        { error: "Engine unavailable", agents: [] },
        { status: 502 }
      );
    }
    return NextResponse.json([]);
  }
}

export async function POST(req: Request) {
  const user = await requireUser();
  const body = await req.json();

  const { name, skills, config, workspaceId } = body;
  if (!name || !skills?.length) {
    return NextResponse.json(
      { error: "name and skills are required" },
      { status: 400 }
    );
  }

  try {
    const agent = await platformCClient.agents.create({
      name,
      ownerId: user.id,
      skills: Array.isArray(skills) ? skills : [skills],
      config: {
        ...config,
        workspaceId: workspaceId ?? config?.workspaceId,
      },
    });
    return NextResponse.json(agent, { status: 201 });
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Failed to create agent";
    const status = msg.includes("API error") ? 502 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
