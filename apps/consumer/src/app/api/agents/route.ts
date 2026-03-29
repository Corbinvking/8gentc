import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { platformCClient } from "@8gent/api-client/platform-c";

export async function GET() {
  const user = await requireUser();

  try {
    const agents = await platformCClient.agents.list({ userId: user.id });
    return NextResponse.json(agents);
  } catch {
    return NextResponse.json([]);
  }
}

export async function POST(req: Request) {
  const user = await requireUser();
  const body = await req.json();

  try {
    const agent = await platformCClient.agents.create({
      ...body,
      ownerId: user.id,
    });
    return NextResponse.json(agent, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create agent" },
      { status: 500 }
    );
  }
}
