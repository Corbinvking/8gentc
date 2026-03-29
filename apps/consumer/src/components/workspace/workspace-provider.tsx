"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";
import { useWorkspaces } from "@/hooks/use-workspace";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { useRouter } from "next/navigation";

interface WorkspaceContextValue {
  workspaceId: string | null;
  workspaceName: string | null;
  role: string | null;
  isLoading: boolean;
}

const WorkspaceContext = createContext<WorkspaceContextValue>({
  workspaceId: null,
  workspaceName: null,
  role: null,
  isLoading: true,
});

export function useWorkspaceContext() {
  return useContext(WorkspaceContext);
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { data: workspaces, isLoading } = useWorkspaces();
  const { setCurrentWorkspaceId } = useWorkspaceStore();
  const router = useRouter();

  const firstWorkspace = workspaces?.data?.[0] ?? workspaces?.[0];

  useEffect(() => {
    if (!isLoading && (!workspaces || workspaces.length === 0)) {
      router.push("/onboarding");
      return;
    }
    if (firstWorkspace) {
      const wsId = firstWorkspace.workspace?.id ?? firstWorkspace.id;
      setCurrentWorkspaceId(wsId);
    }
  }, [isLoading, workspaces, firstWorkspace, setCurrentWorkspaceId, router]);

  const value: WorkspaceContextValue = {
    workspaceId: firstWorkspace?.workspace?.id ?? firstWorkspace?.id ?? null,
    workspaceName:
      firstWorkspace?.workspace?.name ?? firstWorkspace?.name ?? null,
    role: firstWorkspace?.role ?? null,
    isLoading,
  };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}
