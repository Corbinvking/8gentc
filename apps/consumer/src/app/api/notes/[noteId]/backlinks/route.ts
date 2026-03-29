import { NextResponse } from "next/server";
import { db } from "@8gent/db";
import { noteLinks, notes } from "@8gent/db/schema";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ noteId: string }> }
) {
  await requireUser();
  const { noteId } = await params;

  const links = await db
    .select({ id: notes.id, title: notes.title })
    .from(noteLinks)
    .innerJoin(notes, eq(noteLinks.sourceNoteId, notes.id))
    .where(eq(noteLinks.targetNoteId, noteId));

  return NextResponse.json(links);
}
