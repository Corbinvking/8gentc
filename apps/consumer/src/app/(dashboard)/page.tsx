import { NoteGraph } from "@/components/workspace/note-graph";

export default function WorkspacePage() {
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
