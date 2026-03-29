"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export function NoteBacklinks({ noteId }: { noteId: string }) {
  const { data: backlinks, isLoading } = useQuery({
    queryKey: ["backlinks", noteId],
    queryFn: async () => {
      const res = await fetch(`/api/notes/${noteId}/backlinks`);
      if (!res.ok) return [];
      return res.json() as Promise<
        Array<{ id: string; title: string }>
      >;
    },
  });

  if (isLoading) return <div className="text-sm text-zinc-400">Loading backlinks...</div>;
  if (!backlinks?.length) return <div className="text-sm text-zinc-400">No backlinks yet</div>;

  return (
    <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <h3 className="mb-2 text-sm font-medium text-zinc-500">
        Backlinks ({backlinks.length})
      </h3>
      <div className="space-y-1">
        {backlinks.map((link) => (
          <Link
            key={link.id}
            href={`/notes/${link.id}`}
            className="flex items-center gap-1.5 rounded px-2 py-1 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <ArrowUpRight className="h-3.5 w-3.5 text-zinc-400" />
            {link.title || "Untitled"}
          </Link>
        ))}
      </div>
    </div>
  );
}
