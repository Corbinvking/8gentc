import { NextResponse } from "next/server";
import { db } from "@8gent/db";
import { notes } from "@8gent/db/schema";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ noteId: string }> }
) {
  await requireUser();
  const { noteId } = await params;

  const note = await db.query.notes.findFirst({
    where: eq(notes.id, noteId),
  });

  if (!note) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(note);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ noteId: string }> }
) {
  await requireUser();
  const { noteId } = await params;
  const body = await req.json();

  await db
    .update(notes)
    .set({
      ...(body.title !== undefined && { title: body.title }),
      ...(body.content !== undefined && { content: body.content }),
      ...(body.type !== undefined && { type: body.type }),
      updatedAt: new Date(),
    })
    .where(eq(notes.id, noteId));

  const note = await db.query.notes.findFirst({
    where: eq(notes.id, noteId),
  });

  return NextResponse.json(note);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ noteId: string }> }
) {
  await requireUser();
  const { noteId } = await params;

  await db.delete(notes).where(eq(notes.id, noteId));

  return NextResponse.json({ ok: true });
}
