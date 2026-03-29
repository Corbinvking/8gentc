"use client";

import { NoteGraph } from "@/components/workspace/note-graph";
import { useNotes } from "@/hooks/use-notes";
import Link from "next/link";
import { FileText, Bot, MessageSquare, ArrowRight } from "lucide-react";

function OnboardingState() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6">
      <div className="max-w-lg text-center">
        <h2 className="text-2xl font-bold tracking-tight">
          Welcome to your workspace
        </h2>
        <p className="mt-2 text-sm text-zinc-500">
          Start by creating your first note, setting up an agent, or chatting
          with the AI to explore ideas.
        </p>

        <div className="mt-8 grid gap-4 text-left sm:grid-cols-3">
          <Link
            href="/notes/new"
            className="group flex flex-col rounded-lg border border-zinc-200 p-4 transition-colors hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
          >
            <FileText className="h-5 w-5 text-violet-500" />
            <span className="mt-3 text-sm font-medium">Create a note</span>
            <span className="mt-1 text-xs text-zinc-400">
              Capture thoughts, goals, and intentions
            </span>
            <ArrowRight className="mt-auto pt-3 h-4 w-4 text-zinc-300 transition-transform group-hover:translate-x-1 dark:text-zinc-600" />
          </Link>

          <Link
            href="/agents/new"
            className="group flex flex-col rounded-lg border border-zinc-200 p-4 transition-colors hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
          >
            <Bot className="h-5 w-5 text-green-500" />
            <span className="mt-3 text-sm font-medium">Create an agent</span>
            <span className="mt-1 text-xs text-zinc-400">
              Automate research and monitoring tasks
            </span>
            <ArrowRight className="mt-auto pt-3 h-4 w-4 text-zinc-300 transition-transform group-hover:translate-x-1 dark:text-zinc-600" />
          </Link>

          <button
            onClick={() =>
              document.dispatchEvent(new CustomEvent("open-chat"))
            }
            className="group flex flex-col rounded-lg border border-zinc-200 p-4 text-left transition-colors hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
          >
            <MessageSquare className="h-5 w-5 text-blue-500" />
            <span className="mt-3 text-sm font-medium">Start a chat</span>
            <span className="mt-1 text-xs text-zinc-400">
              Ask anything or use slash commands
            </span>
            <ArrowRight className="mt-auto pt-3 h-4 w-4 text-zinc-300 transition-transform group-hover:translate-x-1 dark:text-zinc-600" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function WorkspacePage() {
  const { data: notes = [], isLoading } = useNotes();

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-zinc-400">
        Loading workspace...
      </div>
    );
  }

  if (notes.length === 0) {
    return <OnboardingState />;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
        <h1 className="text-2xl font-bold tracking-tight">Workspace</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Your knowledge graph — click a node to open a note
        </p>
      </div>
      <div className="flex-1">
        <NoteGraph />
      </div>
    </div>
  );
}
