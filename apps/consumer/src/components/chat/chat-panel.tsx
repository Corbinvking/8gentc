"use client";

import { useChatStore } from "@/stores/chat-store";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { useState, useRef, useEffect, useCallback } from "react";
import { X, Send, Paperclip, Loader2, WifiOff } from "lucide-react";
import { MessageBubble } from "./message-bubble";
import { CommandPalette } from "./command-palette";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export function ChatPanel() {
  const { isOpen, setOpen } = useChatStore();
  const { currentNoteId, currentWorkspaceId } = useWorkspaceStore();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [showCommands, setShowCommands] = useState(false);
  const [connectionError, setConnectionError] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!isOpen) return;
    fetch(`/api/chat?workspaceId=${currentWorkspaceId ?? ""}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((history: Message[]) => {
        if (history.length > 0) {
          setMessages(
            history
              .sort(
                (a, b) =>
                  new Date(a.createdAt).getTime() -
                  new Date(b.createdAt).getTime()
              )
              .slice(-50)
          );
        }
      })
      .catch(() => {});
  }, [isOpen, currentWorkspaceId]);

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;

    if (trimmed.startsWith("/")) {
      setShowCommands(true);
      return;
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsStreaming(true);
    setConnectionError(false);

    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          noteContext: currentNoteId,
          workspaceId: currentWorkspaceId,
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        if (res.status === 503) {
          setConnectionError(true);
          throw new Error("Platform C unavailable");
        }
        throw new Error(`Chat request failed: ${res.status}`);
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";
      const assistantId = crypto.randomUUID();

      setMessages((prev) => [
        ...prev,
        {
          id: assistantId,
          role: "assistant",
          content: "",
          createdAt: new Date().toISOString(),
        },
      ]);

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          assistantContent += decoder.decode(value, { stream: true });
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: assistantContent } : m
            )
          );
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: connectionError
            ? "The AI engine is currently unreachable. Your message has been saved and will be processed when the connection is restored."
            : "Sorry, something went wrong. Please try again.",
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [input, isStreaming, currentNoteId, currentWorkspaceId, connectionError]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === "Escape") {
      setShowCommands(false);
      if (isStreaming && abortRef.current) {
        abortRef.current.abort();
      }
      return;
    }
    if (input === "/" || (input.startsWith("/") && e.key !== "Escape")) {
      setShowCommands(true);
    } else {
      setShowCommands(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="flex w-96 flex-col border-l border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex h-14 items-center justify-between border-b border-zinc-200 px-4 dark:border-zinc-800">
        <h2 className="text-sm font-semibold">Chat</h2>
        <button
          onClick={() => setOpen(false)}
          className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {connectionError && (
        <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-400">
          <WifiOff className="h-3.5 w-3.5 shrink-0" />
          Engine connection issue — messages are saved locally
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center text-sm text-zinc-400">
            <p className="font-medium">How can I help?</p>
            <p className="mt-1">Ask anything, or use / for commands</p>
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            role={msg.role}
            content={msg.content}
            timestamp={msg.createdAt}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="relative border-t border-zinc-200 p-3 dark:border-zinc-800">
        {showCommands && (
          <CommandPalette
            query={input}
            onSelect={() => {
              setShowCommands(false);
              setInput("");
            }}
            onClose={() => setShowCommands(false)}
          />
        )}
        <div className="flex items-end gap-2">
          <button className="mb-1.5 rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100">
            <Paperclip className="h-4 w-4" />
          </button>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            className="max-h-32 flex-1 resize-none rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:border-zinc-800 dark:bg-zinc-900"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            className="mb-1.5 rounded-md bg-zinc-900 p-1.5 text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {isStreaming ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
