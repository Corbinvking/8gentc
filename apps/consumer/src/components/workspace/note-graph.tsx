"use client";

import { useCallback, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useRouter } from "next/navigation";
import { useNotes } from "@/hooks/use-notes";
import { useQuery } from "@tanstack/react-query";

const typeColors: Record<string, string> = {
  thought: "#a78bfa",
  goal: "#4ade80",
  intention: "#60a5fa",
  reference: "#a1a1aa",
  "agent-output": "#fbbf24",
};

export function NoteGraph() {
  const router = useRouter();
  const { data: notes = [] } = useNotes();
  const { data: links = [] } = useQuery({
    queryKey: ["note-links"],
    queryFn: async () => {
      const res = await fetch("/api/notes/links");
      if (!res.ok) return [];
      return res.json() as Promise<
        Array<{ sourceNoteId: string; targetNoteId: string }>
      >;
    },
  });

  const initialNodes: Node[] = useMemo(() => {
    return notes.map(
      (
        note: { id: string; title: string; type: string },
        i: number
      ) => ({
        id: note.id,
        position: {
          x: 200 + Math.cos((i / notes.length) * 2 * Math.PI) * 300,
          y: 200 + Math.sin((i / notes.length) * 2 * Math.PI) * 300,
        },
        data: { label: note.title || "Untitled" },
        style: {
          background: typeColors[note.type] ?? typeColors.thought,
          color: "#fff",
          border: "none",
          borderRadius: "8px",
          padding: "8px 16px",
          fontSize: "13px",
          fontWeight: 500,
          cursor: "pointer",
        },
      })
    );
  }, [notes]);

  const initialEdges: Edge[] = useMemo(() => {
    return links.map(
      (link: { sourceNoteId: string; targetNoteId: string }) => ({
        id: `${link.sourceNoteId}-${link.targetNoteId}`,
        source: link.sourceNoteId,
        target: link.targetNoteId,
        style: { stroke: "#a1a1aa", strokeWidth: 1.5 },
      })
    );
  }, [links]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      router.push(`/notes/${node.id}`);
    },
    [router]
  );

  if (notes.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-zinc-400">
        <p className="text-lg font-medium">No notes yet</p>
        <p className="mt-1 text-sm">
          Create your first note to see it appear in the graph
        </p>
      </div>
    );
  }

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={onNodeClick}
      fitView
      proOptions={{ hideAttribution: true }}
    >
      <Background gap={20} size={1} />
      <Controls />
      <MiniMap
        nodeColor={(n) => (n.style?.background as string) ?? "#a1a1aa"}
        maskColor="rgba(0,0,0,0.1)"
      />
    </ReactFlow>
  );
}
