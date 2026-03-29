import { NextResponse } from "next/server";
import { db } from "@8gent/db";
import { notes } from "@8gent/db/schema";
import { eq, and } from "drizzle-orm";
import { requireUser, checkWorkspaceAccess, hasMinimumRole } from "@/lib/auth";

type RouteContext = { params: Promise<{ noteId: string }> };

async function getOwnedNote(userId: string, noteId: string) {
  const note = await db.query.notes.findFirst({
    where: eq(notes.id, noteId),
  });
  if (!note) return null;

  if (note.authorId === userId) return note;

  if (note.workspaceId) {
    const access = await checkWorkspaceAccess(userId, note.workspaceId);
    if (access.authorized) return note;
  }

  return null;
}

export async function GET(_req: Request, { params }: RouteContext) {
  const user = await requireUser();
  const { noteId } = await params;

  const note = await getOwnedNote(user.id, noteId);
  if (!note) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(note);
}

export async function PATCH(req: Request, { params }: RouteContext) {
  const user = await requireUser();
  const { noteId } = await params;
  const body = await req.json();

  const note = await getOwnedNote(user.id, noteId);
  if (!note) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (note.type === "agent-output" && note.authorId !== user.id) {
    return NextResponse.json(
      { error: "Agent output notes are read-only" },
      { status: 403 }
    );
  }

  if (note.workspaceId && note.authorId !== user.id) {
    const access = await checkWorkspaceAccess(user.id, note.workspaceId);
    if (!access.authorized || !hasMinimumRole(access.role!, "member")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  await db
    .update(notes)
    .set({
      ...(body.title !== undefined && { title: body.title }),
      ...(body.content !== undefined && { content: body.content }),
      ...(body.type !== undefined && { type: body.type }),
      updatedAt: new Date(),
    })
    .where(eq(notes.id, noteId));

  const updated = await db.query.notes.findFirst({
    where: eq(notes.id, noteId),
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  const user = await requireUser();
  const { noteId } = await params;

  const note = await getOwnedNote(user.id, noteId);
  if (!note) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (note.workspaceId && note.authorId !== user.id) {
    const access = await checkWorkspaceAccess(user.id, note.workspaceId);
    if (!access.authorized || !hasMinimumRole(access.role!, "admin")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  await db.delete(notes).where(eq(notes.id, noteId));
  return NextResponse.json({ ok: true });
}
