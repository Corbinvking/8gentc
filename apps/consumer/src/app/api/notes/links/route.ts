import { NextResponse } from "next/server";
import { db } from "@8gent/db";
import { noteLinks, notes } from "@8gent/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { requireUser } from "@/lib/auth";

export async function GET(req: Request) {
  const user = await requireUser();
  const url = new URL(req.url);
  const workspaceId = url.searchParams.get("workspaceId");

  const userNotes = await db
    .select({ id: notes.id })
    .from(notes)
    .where(
      workspaceId
        ? eq(notes.workspaceId, workspaceId)
        : eq(notes.authorId, user.id)
    );

  if (userNotes.length === 0) {
    return NextResponse.json([]);
  }

  const noteIds = userNotes.map((n) => n.id);

  const links = await db
    .select()
    .from(noteLinks)
    .where(inArray(noteLinks.sourceNoteId, noteIds));

  return NextResponse.json(links);
}

export async function POST(req: Request) {
  const user = await requireUser();
  const { sourceNoteId, targetNoteId } = await req.json();

  if (!sourceNoteId || !targetNoteId) {
    return NextResponse.json(
      { error: "sourceNoteId and targetNoteId required" },
      { status: 400 }
    );
  }

  if (sourceNoteId === targetNoteId) {
    return NextResponse.json(
      { error: "Cannot link a note to itself" },
      { status: 400 }
    );
  }

  const [source, target] = await Promise.all([
    db.query.notes.findFirst({ where: eq(notes.id, sourceNoteId) }),
    db.query.notes.findFirst({ where: eq(notes.id, targetNoteId) }),
  ]);

  if (!source || !target) {
    return NextResponse.json(
      { error: "One or both notes not found" },
      { status: 404 }
    );
  }

  if (source.authorId !== user.id && target.authorId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db
    .insert(noteLinks)
    .values({ sourceNoteId, targetNoteId })
    .onConflictDoNothing();

  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(req: Request) {
  const user = await requireUser();
  const { sourceNoteId, targetNoteId } = await req.json();

  if (!sourceNoteId || !targetNoteId) {
    return NextResponse.json(
      { error: "sourceNoteId and targetNoteId required" },
      { status: 400 }
    );
  }

  const source = await db.query.notes.findFirst({
    where: eq(notes.id, sourceNoteId),
  });

  if (!source || source.authorId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db
    .delete(noteLinks)
    .where(
      and(
        eq(noteLinks.sourceNoteId, sourceNoteId),
        eq(noteLinks.targetNoteId, targetNoteId)
      )
    );

  return NextResponse.json({ ok: true });
}
