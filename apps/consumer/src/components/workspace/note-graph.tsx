"use client";

import { useCallback, useMemo, useEffect } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
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

const LARGE_GRAPH_THRESHOLD = 500;

/**
 * Simple force-directed layout.
 * Runs a fixed number of iterations on the CPU to position nodes
 * based on spring forces (links pull) and repulsion (nodes push apart).
 */
function forceLayout(
  noteList: Array<{ id: string; title: string; type: string }>,
  linkList: Array<{ sourceNoteId: string; targetNoteId: string }>
): Record<string, { x: number; y: number }> {
  const positions: Record<string, { x: number; y: number }> = {};

  noteList.forEach((n, i) => {
    const angle = (i / noteList.length) * 2 * Math.PI;
    const radius = Math.min(300, noteList.length * 3);
    positions[n.id] = {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    };
  });

  const iterations = Math.min(100, Math.max(30, 300 - noteList.length));
  const repulsion = 5000;
  const springLength = 120;
  const springStrength = 0.05;
  const damping = 0.9;

  const velocities: Record<string, { vx: number; vy: number }> = {};
  for (const id of Object.keys(positions)) {
    velocities[id] = { vx: 0, vy: 0 };
  }

  const ids = Object.keys(positions);

  for (let iter = 0; iter < iterations; iter++) {
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = positions[ids[i]];
        const b = positions[ids[j]];
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = repulsion / (dist * dist);
        dx = (dx / dist) * force;
        dy = (dy / dist) * force;
        velocities[ids[i]].vx -= dx;
        velocities[ids[i]].vy -= dy;
        velocities[ids[j]].vx += dx;
        velocities[ids[j]].vy += dy;
      }
    }

    for (const link of linkList) {
      const a = positions[link.sourceNoteId];
      const b = positions[link.targetNoteId];
      if (!a || !b) continue;
      let dx = b.x - a.x;
      let dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = (dist - springLength) * springStrength;
      dx = (dx / dist) * force;
      dy = (dy / dist) * force;
      velocities[link.sourceNoteId].vx += dx;
      velocities[link.sourceNoteId].vy += dy;
      velocities[link.targetNoteId].vx -= dx;
      velocities[link.targetNoteId].vy -= dy;
    }

    for (const id of ids) {
      velocities[id].vx *= damping;
      velocities[id].vy *= damping;
      positions[id].x += velocities[id].vx;
      positions[id].y += velocities[id].vy;
    }
  }

  return positions;
}

function NoteGraphInner() {
  const router = useRouter();
  const { fitView } = useReactFlow();
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

  const positions = useMemo(
    () => forceLayout(notes, links),
    [notes, links]
  );

  const computedNodes: Node[] = useMemo(() => {
    return notes.map((note: { id: string; title: string; type: string }) => ({
      id: note.id,
      position: positions[note.id] ?? { x: 0, y: 0 },
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
    }));
  }, [notes, positions]);

  const computedEdges: Edge[] = useMemo(() => {
    return links.map(
      (link: { sourceNoteId: string; targetNoteId: string }) => ({
        id: `${link.sourceNoteId}-${link.targetNoteId}`,
        source: link.sourceNoteId,
        target: link.targetNoteId,
        style: { stroke: "#a1a1aa", strokeWidth: 1.5 },
      })
    );
  }, [links]);

  const [nodes, setNodes, onNodesChange] = useNodesState(computedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(computedEdges);

  useEffect(() => {
    setNodes(computedNodes);
  }, [computedNodes, setNodes]);

  useEffect(() => {
    setEdges(computedEdges);
  }, [computedEdges, setEdges]);

  useEffect(() => {
    if (nodes.length > 0) {
      setTimeout(() => fitView({ padding: 0.2 }), 50);
    }
  }, [nodes.length, fitView]);

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
    <>
      {notes.length > LARGE_GRAPH_THRESHOLD && (
        <div className="absolute left-4 top-4 z-10 rounded-md bg-zinc-800/80 px-3 py-1.5 text-xs text-zinc-300">
          Showing {notes.length} notes &middot; Drag to explore, scroll to zoom
        </div>
      )}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onlyRenderVisibleElements
        nodesDraggable
        fitView
        minZoom={0.1}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={20} size={1} />
        <Controls />
        <MiniMap
          nodeColor={(n) => (n.style?.background as string) ?? "#a1a1aa"}
          maskColor="rgba(0,0,0,0.1)"
        />
      </ReactFlow>
    </>
  );
}

export function NoteGraph() {
  return (
    <ReactFlowProvider>
      <NoteGraphInner />
    </ReactFlowProvider>
  );
}
