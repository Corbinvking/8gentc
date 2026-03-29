"use client";

import Link from "next/link";
import { formatRelativeTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface NoteCardProps {
  id: string;
  title: string;
  type: string;
  updatedAt: string;
  preview?: string;
  tags?: string[];
}

const typeColors: Record<string, string> = {
  thought: "border-l-purple-400",
  goal: "border-l-green-400",
  intention: "border-l-blue-400",
  reference: "border-l-zinc-400",
  "agent-output": "border-l-amber-400",
};

export function NoteCard({
  id,
  title,
  type,
  updatedAt,
  preview,
  tags,
}: NoteCardProps) {
  return (
    <Link
      href={`/notes/${id}`}
      className={cn(
        "block rounded-lg border border-zinc-200 border-l-4 p-4 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900",
        typeColors[type] ?? typeColors.thought
      )}
    >
      <h3 className="font-medium">{title || "Untitled"}</h3>
      {preview && (
        <p className="mt-1 line-clamp-2 text-sm text-zinc-500">{preview}</p>
      )}
      <div className="mt-2 flex items-center gap-2">
        <span className="text-xs text-zinc-400">
          {formatRelativeTime(updatedAt)}
        </span>
        {tags?.map((tag) => (
          <span
            key={tag}
            className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
          >
            {tag}
          </span>
        ))}
      </div>
    </Link>
  );
}
