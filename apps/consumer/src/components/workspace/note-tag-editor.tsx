"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { X, Plus } from "lucide-react";

export function NoteTagEditor({ noteId }: { noteId: string }) {
  const queryClient = useQueryClient();
  const [newTag, setNewTag] = useState("");

  const { data: tags = [] } = useQuery({
    queryKey: ["note-tags", noteId],
    queryFn: async () => {
      const res = await fetch(`/api/notes/${noteId}/tags`);
      if (!res.ok) return [];
      return res.json() as Promise<string[]>;
    },
  });

  const addTag = useMutation({
    mutationFn: async (tag: string) => {
      await fetch(`/api/notes/${noteId}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tag }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["note-tags", noteId] });
      setNewTag("");
    },
  });

  const removeTag = useMutation({
    mutationFn: async (tag: string) => {
      await fetch(`/api/notes/${noteId}/tags/${encodeURIComponent(tag)}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["note-tags", noteId] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newTag.trim();
    if (trimmed && !tags.includes(trimmed)) {
      addTag.mutate(trimmed);
    }
  };

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
        >
          {tag}
          <button
            onClick={() => removeTag.mutate(tag)}
            className="rounded-full p-0.5 hover:bg-zinc-200 dark:hover:bg-zinc-700"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <form onSubmit={handleSubmit} className="inline-flex items-center gap-1">
        <input
          type="text"
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          placeholder="Add tag..."
          className="h-7 w-24 rounded-md border border-zinc-200 bg-transparent px-2 text-xs placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:border-zinc-700"
        />
        <button
          type="submit"
          className="rounded p-1 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </form>
    </div>
  );
}
