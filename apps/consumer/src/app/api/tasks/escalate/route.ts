import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { platformCClient } from "@8gent/api-client/platform-c";

export async function POST(req: Request) {
  const user = await requireUser();
  const body = await req.json();

  try {
    const result = await platformCClient.tasks.escalate({
      title: body.title,
      description: body.description,
      userId: user.id,
      workspaceId: body.workspaceId,
      contextNoteIds: body.contextNoteIds ?? [],
      estimatedBudget: body.estimatedBudget,
    });
    return NextResponse.json(result, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to escalate task" },
      { status: 500 }
    );
  }
}
