"use client";

import { useNote, useUpdateNote, useDeleteNote } from "@/hooks/use-notes";
import { NoteEditor } from "./note-editor";
import { NoteBacklinks } from "./note-backlinks";
import { NoteTagEditor } from "./note-tag-editor";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Trash2, ArrowLeft, Tag, Link2 } from "lucide-react";
import { toast } from "sonner";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { cn } from "@/lib/utils";

const noteTypeLabels: Record<string, string> = {
  thought: "Thought",
  goal: "Goal",
  intention: "Intention",
  reference: "Reference",
  "agent-output": "Agent Output",
};

const noteTypeColors: Record<string, string> = {
  thought: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  goal: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  intention: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  reference: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400",
  "agent-output":
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

export function NoteEditorPage({ noteId }: { noteId: string }) {
  const { data: note, isLoading } = useNote(noteId);
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();
  const router = useRouter();
  const { setCurrentNoteId } = useWorkspaceStore();
  const [title, setTitle] = useState("");
  const [noteType, setNoteType] = useState("thought");
  const [showBacklinks, setShowBacklinks] = useState(false);
  const [showTags, setShowTags] = useState(false);

  useEffect(() => {
    setCurrentNoteId(noteId);
    return () => setCurrentNoteId(null);
  }, [noteId, setCurrentNoteId]);

  useEffect(() => {
    if (note) {
      setTitle(note.title ?? "");
      setNoteType(note.type ?? "thought");
    }
  }, [note]);

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    updateNote.mutate({ noteId, title: newTitle });
  };

  const handleContentUpdate = (content: string) => {
    updateNote.mutate({ noteId, content });
  };

  const handleDelete = async () => {
    if (!confirm("Delete this note? This cannot be undone.")) return;
    await deleteNote.mutateAsync(noteId);
    toast.success("Note deleted");
    router.push("/");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12 text-zinc-400">
        Loading...
      </div>
    );
  }

  if (!note) {
    return (
      <div className="flex items-center justify-center p-12 text-zinc-400">
        Note not found
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-6">
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <div className="flex items-center gap-2">
          <select
            value={noteType}
            onChange={(e) => {
              setNoteType(e.target.value);
              updateNote.mutate({ noteId, type: e.target.value });
            }}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium",
              noteTypeColors[noteType] ?? noteTypeColors.thought
            )}
          >
            {Object.entries(noteTypeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <button
            onClick={() => setShowTags((v) => !v)}
            className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            aria-label="Tags"
          >
            <Tag className="h-4 w-4" />
          </button>
          <button
            onClick={() => setShowBacklinks((v) => !v)}
            className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            aria-label="Backlinks"
          >
            <Link2 className="h-4 w-4" />
          </button>
          <button
            onClick={handleDelete}
            className="rounded-md p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400"
            aria-label="Delete note"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <input
        type="text"
        value={title}
        onChange={(e) => handleTitleChange(e.target.value)}
        placeholder="Untitled"
        className="mb-4 w-full bg-transparent text-3xl font-bold tracking-tight placeholder:text-zinc-300 focus:outline-none dark:placeholder:text-zinc-700"
      />

      {showTags && <NoteTagEditor noteId={noteId} />}

      <NoteEditor
        content={note.content ?? ""}
        onUpdate={handleContentUpdate}
      />

      {showBacklinks && (
        <div className="mt-6">
          <NoteBacklinks noteId={noteId} />
        </div>
      )}
    </div>
  );
}
