"use client";

import { useRouter } from "next/navigation";
import { Bot, Target, Search } from "lucide-react";

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

  const commands: Command[] = [
    {
      id: "create-agent",
      name: "/create-agent",
      description: "Create a new agent",
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
      action: () => {
        router.push("/notes/new?type=goal");
        onSelect("set-goal");
      },
    },
    {
      id: "search",
      name: "/search",
      description: "Search across all notes",
      icon: Search,
      action: () => {
        onSelect("search");
      },
    },
  ];

  const filtered = commands.filter((cmd) =>
    cmd.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 rounded-lg border border-zinc-200 bg-white p-1 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
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
