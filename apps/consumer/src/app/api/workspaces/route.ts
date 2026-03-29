import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@8gent/db";
import { users, workspaces, workspaceMembers } from "@8gent/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json([], { status: 401 });

  const user = await db.query.users.findFirst({
    where: eq(users.clerkId, clerkId),
  });

  if (!user) return NextResponse.json([]);

  const memberships = await db
    .select({ workspace: workspaces, role: workspaceMembers.role })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
    .where(eq(workspaceMembers.userId, user.id));

  return NextResponse.json(memberships);
}

export async function POST(req: Request) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await db.query.users.findFirst({
    where: eq(users.clerkId, clerkId),
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { name } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }

  const workspaceId = crypto.randomUUID();

  await db.insert(workspaces).values({
    id: workspaceId,
    name: name.trim(),
    ownerId: user.id,
  });

  await db.insert(workspaceMembers).values({
    userId: user.id,
    workspaceId,
    role: "owner",
  });

  const workspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.id, workspaceId),
  });

  return NextResponse.json(workspace, { status: 201 });
}
