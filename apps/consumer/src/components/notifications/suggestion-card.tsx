"use client";

import { Target, Bot, Clock, Info, ThumbsUp, ThumbsDown, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/utils";
import type { Notification } from "@/hooks/use-notifications";

interface SuggestionCardProps {
  notification: Notification;
  onMarkRead: () => void;
  onDismiss: () => void;
  onFeedback: (helpful: boolean) => void;
}

const typeConfig: Record<
  string,
  {
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    bgColor: string;
  }
> = {
  goal_nudge: {
    icon: Target,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-50 dark:bg-green-950/20",
  },
  agent_finding: {
    icon: Bot,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-950/20",
  },
  stale_content: {
    icon: Clock,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-50 dark:bg-amber-950/20",
  },
  system: {
    icon: Info,
    color: "text-zinc-600 dark:text-zinc-400",
    bgColor: "bg-zinc-50 dark:bg-zinc-900",
  },
};

export function SuggestionCard({
  notification,
  onMarkRead,
  onDismiss,
  onFeedback,
}: SuggestionCardProps) {
  const config = typeConfig[notification.type] ?? typeConfig.system;
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "relative rounded-lg border p-4 transition-colors",
        notification.read
          ? "border-zinc-200 dark:border-zinc-800"
          : "border-zinc-300 bg-white dark:border-zinc-700 dark:bg-zinc-900"
      )}
    >
      <div className="flex gap-3">
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
            config.bgColor
          )}
        >
          <Icon className={cn("h-4 w-4", config.color)} />
        </div>

        <div className="flex-1">
          <div className="flex items-start justify-between">
            <h3
              className={cn(
                "text-sm",
                notification.read ? "font-normal" : "font-medium"
              )}
            >
              {notification.title}
            </h3>
            <div className="flex items-center gap-1">
              {!notification.read && (
                <button
                  onClick={onMarkRead}
                  className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                  title="Mark as read"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                onClick={onDismiss}
                className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                title="Dismiss"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <p className="mt-1 text-sm text-zinc-500">{notification.body}</p>

          <div className="mt-2 flex items-center gap-3 text-xs text-zinc-400">
            <span>{formatRelativeTime(notification.createdAt)}</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onFeedback(true)}
                className="rounded p-1 hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-950 dark:hover:text-green-400"
                title="Helpful"
              >
                <ThumbsUp className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => onFeedback(false)}
                className="rounded p-1 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400"
                title="Not helpful"
              >
                <ThumbsDown className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {!notification.read && (
        <div className="absolute left-1.5 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-blue-500" />
      )}
    </div>
  );
}
