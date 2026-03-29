import { create } from "zustand";

interface ChatState {
  isOpen: boolean;
  activeThreadId: string | null;
  toggle: () => void;
  setOpen: (open: boolean) => void;
  setActiveThread: (threadId: string | null) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  isOpen: false,
  activeThreadId: null,
  toggle: () => set((s) => ({ isOpen: !s.isOpen })),
  setOpen: (open) => set({ isOpen: open }),
  setActiveThread: (threadId) => set({ activeThreadId: threadId }),
}));
