import { NextResponse } from "next/server";
import { db } from "@8gent/db";
import { notes } from "@8gent/db/schema";
import { eq, desc, and, or, ilike } from "drizzle-orm";
import { requireUser, checkWorkspaceAccess } from "@/lib/auth";

export async function GET(req: Request) {
  const user = await requireUser();
  const url = new URL(req.url);
  const workspaceId = url.searchParams.get("workspaceId");
  const search = url.searchParams.get("q");

  if (workspaceId) {
    const access = await checkWorkspaceAccess(user.id, workspaceId);
    if (!access.authorized) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const conditions = [eq(notes.workspaceId, workspaceId)];
    if (search) {
      conditions.push(
        or(
          ilike(notes.title, `%${search}%`),
          ilike(notes.content, `%${search}%`)
        )!
      );
    }

    const results = await db
      .select()
      .from(notes)
      .where(and(...conditions))
      .orderBy(desc(notes.updatedAt))
      .limit(200);

    return NextResponse.json(results);
  }

  const conditions = [eq(notes.authorId, user.id)];
  if (search) {
    conditions.push(
      or(
        ilike(notes.title, `%${search}%`),
        ilike(notes.content, `%${search}%`)
      )!
    );
  }

  const results = await db
    .select()
    .from(notes)
    .where(and(...conditions))
    .orderBy(desc(notes.updatedAt))
    .limit(200);

  return NextResponse.json(results);
}

export async function POST(req: Request) {
  const user = await requireUser();
  const body = await req.json();

  if (body.workspaceId) {
    const access = await checkWorkspaceAccess(user.id, body.workspaceId);
    if (!access.authorized) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

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
