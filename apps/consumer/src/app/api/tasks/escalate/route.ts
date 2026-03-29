import { NextResponse } from "next/server";
import { requireUser, checkWorkspaceAccess } from "@/lib/auth";
import { platformCClient } from "@8gent/api-client/platform-c";
import { db } from "@8gent/db";
import { notes, noteLinks } from "@8gent/db/schema";
import { eq, inArray } from "drizzle-orm";

async function gatherKnowledgeExcerpts(
  contextNoteIds: string[]
): Promise<Array<{ noteId: string; title: string; content: string }>> {
  if (!contextNoteIds.length) return [];

  const contextNotes = await db
    .select({ id: notes.id, title: notes.title, content: notes.content })
    .from(notes)
    .where(inArray(notes.id, contextNoteIds));

  const linkedNoteIds = await db
    .select({ targetNoteId: noteLinks.targetNoteId })
    .from(noteLinks)
    .where(inArray(noteLinks.sourceNoteId, contextNoteIds));

  const linkedIds = linkedNoteIds
    .map((l) => l.targetNoteId)
    .filter((id) => !contextNoteIds.includes(id));

  let linkedNotes: Array<{ id: string; title: string; content: string | null }> = [];
  if (linkedIds.length > 0) {
    linkedNotes = await db
      .select({ id: notes.id, title: notes.title, content: notes.content })
      .from(notes)
      .where(inArray(notes.id, linkedIds.slice(0, 10)));
  }

  return [...contextNotes, ...linkedNotes].map((n) => ({
    noteId: n.id,
    title: n.title,
    content: stripHtml(n.content ?? "").slice(0, 2000),
  }));
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export async function POST(req: Request) {
  const user = await requireUser();
  const body = await req.json();

  const { title, description, workspaceId, contextNoteIds, estimatedBudget } =
    body;

  if (!title?.trim() || !description?.trim()) {
    return NextResponse.json(
      { error: "title and description are required" },
      { status: 400 }
    );
  }

  if (workspaceId) {
    const access = await checkWorkspaceAccess(user.id, workspaceId);
    if (!access) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const knowledgeExcerpts = await gatherKnowledgeExcerpts(
    contextNoteIds ?? []
  );

  try {
    const result = await platformCClient.tasks.escalate({
      title,
      description,
      userId: user.id,
      workspaceId: workspaceId ?? "",
      contextNoteIds: contextNoteIds ?? [],
      knowledgeExcerpts,
      estimatedBudget,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Failed to escalate task";
    const status = msg.includes("API error") ? 502 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
