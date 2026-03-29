import { NextResponse } from "next/server";
import { db } from "@8gent/db";
import { notes } from "@8gent/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { requireUser } from "@/lib/auth";

export async function GET(req: Request) {
  const user = await requireUser();
  const url = new URL(req.url);
  const workspaceId = url.searchParams.get("workspaceId");
  const search = url.searchParams.get("q");

  let query = db
    .select()
    .from(notes)
    .where(eq(notes.authorId, user.id))
    .orderBy(desc(notes.updatedAt));

  if (workspaceId) {
    query = db
      .select()
      .from(notes)
      .where(eq(notes.workspaceId, workspaceId))
      .orderBy(desc(notes.updatedAt));
  }

  const results = await query;
  return NextResponse.json(results);
}

export async function POST(req: Request) {
  const user = await requireUser();
  const body = await req.json();

  const noteId = crypto.randomUUID();

  await db.insert(notes).values({
    id: noteId,
    title: body.title ?? "Untitled",
    content: body.content ?? "",
    type: body.type ?? "thought",
    workspaceId: body.workspaceId,
    authorId: user.id,
  });

  const note = await db.query.notes.findFirst({
    where: eq(notes.id, noteId),
  });

  return NextResponse.json(note, { status: 201 });
}
