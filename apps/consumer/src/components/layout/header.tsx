"use client";

import { UserButton } from "@clerk/nextjs";
import { Bell, MessageSquare } from "lucide-react";
import { useNotificationStore } from "@/stores/notification-store";
import { useChatStore } from "@/stores/chat-store";
import { cn } from "@/lib/utils";

export function Header() {
  const { unreadCount, toggleDropdown } = useNotificationStore();
  const { toggle: toggleChat } = useChatStore();

  return (
    <header className="flex h-14 items-center justify-end gap-2 border-b border-zinc-200 px-4 dark:border-zinc-800">
      <button
        onClick={toggleChat}
        className="relative rounded-md p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        aria-label="Toggle chat"
      >
        <MessageSquare className="h-5 w-5" />
      </button>

      <button
        onClick={toggleDropdown}
        className="relative rounded-md p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <div className="ml-2">
        <UserButton
          afterSignOutUrl="/sign-in"
          appearance={{
            elements: {
              avatarBox: "h-8 w-8",
            },
          }}
        />
      </div>
    </header>
  );
}
