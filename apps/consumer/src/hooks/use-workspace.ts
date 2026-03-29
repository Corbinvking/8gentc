"use client";

import { useQuery } from "@tanstack/react-query";
import { useWorkspaceStore } from "@/stores/workspace-store";

export function useWorkspace() {
  const { currentWorkspaceId } = useWorkspaceStore();

  const workspaceQuery = useQuery({
    queryKey: ["workspace", currentWorkspaceId],
    queryFn: async () => {
      if (!currentWorkspaceId) return null;
      const res = await fetch(`/api/workspaces/${currentWorkspaceId}`);
      if (!res.ok) throw new Error("Failed to fetch workspace");
      return res.json();
    },
    enabled: !!currentWorkspaceId,
  });

  return {
    workspace: workspaceQuery.data,
    isLoading: workspaceQuery.isLoading,
    error: workspaceQuery.error,
  };
}

export function useWorkspaces() {
  return useQuery({
    queryKey: ["workspaces"],
    queryFn: async () => {
      const res = await fetch("/api/workspaces");
      if (!res.ok) throw new Error("Failed to fetch workspaces");
      return res.json();
    },
  });
}
