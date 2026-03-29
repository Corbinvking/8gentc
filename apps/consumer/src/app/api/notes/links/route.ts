import { NextResponse } from "next/server";
import { db } from "@8gent/db";
import { noteLinks } from "@8gent/db/schema";
import { requireUser } from "@/lib/auth";

export async function GET() {
  await requireUser();

  const links = await db.select().from(noteLinks);

  return NextResponse.json(links);
}

export async function POST(req: Request) {
  await requireUser();
  const { sourceNoteId, targetNoteId } = await req.json();

  if (!sourceNoteId || !targetNoteId) {
    return NextResponse.json(
      { error: "sourceNoteId and targetNoteId required" },
      { status: 400 }
    );
  }

  await db
    .insert(noteLinks)
    .values({ sourceNoteId, targetNoteId })
    .onConflictDoNothing();

  return NextResponse.json({ ok: true }, { status: 201 });
}
