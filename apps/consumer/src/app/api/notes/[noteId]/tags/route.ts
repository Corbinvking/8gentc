import { NextResponse } from "next/server";
import { db } from "@8gent/db";
import { noteTags } from "@8gent/db/schema";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ noteId: string }> }
) {
  await requireUser();
  const { noteId } = await params;

  const tags = await db
    .select({ tag: noteTags.tag })
    .from(noteTags)
    .where(eq(noteTags.noteId, noteId));

  return NextResponse.json(tags.map((t) => t.tag));
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ noteId: string }> }
) {
  await requireUser();
  const { noteId } = await params;
  const { tag } = await req.json();

  if (!tag?.trim()) {
    return NextResponse.json({ error: "Tag required" }, { status: 400 });
  }

  await db
    .insert(noteTags)
    .values({ noteId, tag: tag.trim() })
    .onConflictDoNothing();

  return NextResponse.json({ ok: true }, { status: 201 });
}
