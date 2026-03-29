"use client";

import { useQuery } from "@tanstack/react-query";
import { useChatStore } from "@/stores/chat-store";
import { useWorkspaceStore } from "@/stores/workspace-store";

export function useChatHistory() {
  const { currentWorkspaceId } = useWorkspaceStore();

  return useQuery({
    queryKey: ["chat-history", currentWorkspaceId],
    queryFn: async () => {
      const res = await fetch(
        `/api/chat/history?workspaceId=${currentWorkspaceId}`
      );
      if (!res.ok) throw new Error("Failed to fetch chat history");
      return res.json();
    },
    enabled: !!currentWorkspaceId,
  });
}

export function useChatMessages(threadId: string | null) {
  return useQuery({
    queryKey: ["chat-messages", threadId],
    queryFn: async () => {
      if (!threadId) return [];
      const res = await fetch(`/api/chat/threads/${threadId}/messages`);
      if (!res.ok) throw new Error("Failed to fetch messages");
      return res.json();
    },
    enabled: !!threadId,
  });
}

export { useChatStore };
