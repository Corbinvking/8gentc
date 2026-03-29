"use client";

import { Bot, User, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/utils";
import { useCreateNote } from "@/hooks/use-notes";
import { toast } from "sonner";

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export function MessageBubble({ role, content, timestamp }: MessageBubbleProps) {
  const createNote = useCreateNote();

  const saveAsNote = async () => {
    try {
      await createNote.mutateAsync({
        title: content.slice(0, 80) + (content.length > 80 ? "..." : ""),
        content: `<p>${content}</p>`,
        type: "agent-output",
      });
      toast.success("Saved as note");
    } catch {
      toast.error("Failed to save note");
    }
  };

  return (
    <div
      className={cn(
        "mb-4 flex gap-3",
        role === "user" ? "flex-row-reverse" : "flex-row"
      )}
    >
      <div
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
          role === "user"
            ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
            : "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
        )}
      >
        {role === "user" ? (
          <User className="h-3.5 w-3.5" />
        ) : (
          <Bot className="h-3.5 w-3.5" />
        )}
      </div>

      <div
        className={cn(
          "max-w-[80%] rounded-lg px-3 py-2 text-sm",
          role === "user"
            ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
            : "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
        )}
      >
        <p className="whitespace-pre-wrap">{content}</p>
        <div
          className={cn(
            "mt-1 flex items-center gap-2 text-xs",
            role === "user"
              ? "text-zinc-400"
              : "text-zinc-400"
          )}
        >
          <span>{formatRelativeTime(timestamp)}</span>
          {role === "assistant" && content && (
            <button
              onClick={saveAsNote}
              className="inline-flex items-center gap-1 hover:text-zinc-900 dark:hover:text-zinc-100"
              title="Save as note"
            >
              <FileText className="h-3 w-3" />
              Save
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
