import { create } from "zustand";

interface WorkspaceState {
  currentWorkspaceId: string | null;
  currentNoteId: string | null;
  sidebarOpen: boolean;
  setCurrentWorkspaceId: (id: string | null) => void;
  setCurrentNoteId: (id: string | null) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  currentWorkspaceId: null,
  currentNoteId: null,
  sidebarOpen: true,
  setCurrentWorkspaceId: (id) => set({ currentWorkspaceId: id }),
  setCurrentNoteId: (id) => set({ currentNoteId: id }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}));
