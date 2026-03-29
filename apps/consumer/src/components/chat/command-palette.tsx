"use client";

import { useRouter } from "next/navigation";
import { Bot, Target, Search, FileText, Activity } from "lucide-react";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { useEffect, useRef } from "react";

interface Command {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
}

interface CommandPaletteProps {
  query: string;
  onSelect: (command: string) => void;
  onClose: () => void;
}

export function CommandPalette({ query, onSelect, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const { currentWorkspaceId } = useWorkspaceStore();
  const paletteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (paletteRef.current && !paletteRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const commands: Command[] = [
    {
      id: "create-agent",
      name: "/create-agent",
      description: "Open the agent creation wizard",
      icon: Bot,
      action: () => {
        router.push("/agents/new");
        onSelect("create-agent");
      },
    },
    {
      id: "set-goal",
      name: "/set-goal",
      description: "Create a new goal note",
      icon: Target,
      action: async () => {
        try {
          const res = await fetch("/api/notes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: "New Goal",
              content: "",
              type: "goal",
              workspaceId: currentWorkspaceId,
            }),
          });
          if (res.ok) {
            const note = await res.json();
            router.push(`/notes/${note.id}`);
          }
        } catch {
          // navigation fallback
          router.push("/notes/new?type=goal");
        }
        onSelect("set-goal");
      },
    },
    {
      id: "search",
      name: "/search",
      description: "Search across all notes",
      icon: Search,
      action: () => {
        const searchQuery = query.replace(/^\/search\s*/, "").trim();
        if (searchQuery) {
          router.push(`/notes?search=${encodeURIComponent(searchQuery)}`);
        } else {
          router.push("/notes?focus=search");
        }
        onSelect("search");
      },
    },
    {
      id: "new-note",
      name: "/note",
      description: "Create a new note",
      icon: FileText,
      action: () => {
        router.push("/notes/new");
        onSelect("new-note");
      },
    },
    {
      id: "usage",
      name: "/usage",
      description: "View current usage and billing",
      icon: Activity,
      action: () => {
        router.push("/billing");
        onSelect("usage");
      },
    },
  ];

  const filtered = commands.filter((cmd) =>
    cmd.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div
      ref={paletteRef}
      className="absolute bottom-full left-0 right-0 mb-2 rounded-lg border border-zinc-200 bg-white p-1 shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
    >
      {filtered.map((cmd) => (
        <button
          key={cmd.id}
          onClick={cmd.action}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          <cmd.icon className="h-4 w-4 text-zinc-400" />
          <div>
            <span className="font-medium">{cmd.name}</span>
            <span className="ml-2 text-zinc-400">{cmd.description}</span>
          </div>
        </button>
      ))}
      {filtered.length === 0 && (
        <div className="px-3 py-2 text-sm text-zinc-400">No commands found</div>
      )}
    </div>
  );
}
