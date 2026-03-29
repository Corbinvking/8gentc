"use client";

import {
  useNotifications,
  useMarkNotificationRead,
  useDismissNotification,
  useSubmitFeedback,
  type Notification,
} from "@/hooks/use-notifications";
import { SuggestionCard } from "./suggestion-card";
import { Bell, Check, Filter } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function NotificationCenterPage() {
  const { data: notifications = [], isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();
  const dismiss = useDismissNotification();
  const feedback = useSubmitFeedback();
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const filtered =
    filter === "unread"
      ? notifications.filter((n) => !n.read)
      : notifications;

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="mx-auto max-w-3xl px-6 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}`
              : "You're all caught up"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter(filter === "all" ? "unread" : "all")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm",
              filter === "unread"
                ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                : "border-zinc-200 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
            )}
          >
            <Filter className="h-3.5 w-3.5" />
            {filter === "unread" ? "Unread only" : "All"}
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="mt-8 text-sm text-zinc-400">Loading...</div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div className="mt-12 flex flex-col items-center text-center text-zinc-400">
          <Bell className="h-12 w-12" />
          <p className="mt-4 text-lg font-medium">No notifications</p>
          <p className="mt-1 text-sm">
            You&apos;ll see suggestions and updates from your agents here
          </p>
        </div>
      )}

      <div className="mt-6 space-y-3">
        {filtered.map((notification) => (
          <SuggestionCard
            key={notification.id}
            notification={notification}
            onMarkRead={() => markRead.mutate(notification.id)}
            onDismiss={() => dismiss.mutate(notification.id)}
            onFeedback={(helpful) =>
              feedback.mutate({
                notificationId: notification.id,
                helpful,
              })
            }
          />
        ))}
      </div>
    </div>
  );
}
