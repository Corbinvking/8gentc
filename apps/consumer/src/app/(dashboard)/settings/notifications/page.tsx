"use client";

import { useState } from "react";

interface NotificationPreference {
  type: string;
  label: string;
  description: string;
  inApp: boolean;
  chat: boolean;
  email: boolean;
}

const defaultPreferences: NotificationPreference[] = [
  {
    type: "goal_nudge",
    label: "Goal Nudges",
    description: "Reminders about goals that need action plans or updates",
    inApp: true,
    chat: true,
    email: false,
  },
  {
    type: "agent_finding",
    label: "Agent Findings",
    description: "When your agents discover something relevant",
    inApp: true,
    chat: true,
    email: true,
  },
  {
    type: "stale_content",
    label: "Stale Content Alerts",
    description: "Reminders about notes that haven't been updated",
    inApp: true,
    chat: false,
    email: false,
  },
  {
    type: "system",
    label: "System Notifications",
    description: "Agent errors, billing alerts, and account updates",
    inApp: true,
    chat: false,
    email: true,
  },
];

export default function NotificationPreferencesPage() {
  const [prefs, setPrefs] = useState(defaultPreferences);

  const togglePref = (
    index: number,
    channel: "inApp" | "chat" | "email"
  ) => {
    setPrefs((prev) =>
      prev.map((p, i) => (i === index ? { ...p, [channel]: !p[channel] } : p))
    );
  };

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="text-2xl font-bold tracking-tight">
        Notification Preferences
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        Choose how you want to be notified
      </p>

      <div className="mt-8">
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 gap-y-1 text-sm">
          <div />
          <div className="px-3 py-2 text-center font-medium text-zinc-500">
            In-App
          </div>
          <div className="px-3 py-2 text-center font-medium text-zinc-500">
            Chat
          </div>
          <div className="px-3 py-2 text-center font-medium text-zinc-500">
            Email
          </div>

          {prefs.map((pref, i) => (
            <>
              <div key={pref.type} className="py-3">
                <div className="font-medium">{pref.label}</div>
                <div className="text-zinc-500">{pref.description}</div>
              </div>
              <div className="flex items-center justify-center">
                <input
                  type="checkbox"
                  checked={pref.inApp}
                  onChange={() => togglePref(i, "inApp")}
                  className="h-4 w-4 rounded border-zinc-300"
                />
              </div>
              <div className="flex items-center justify-center">
                <input
                  type="checkbox"
                  checked={pref.chat}
                  onChange={() => togglePref(i, "chat")}
                  className="h-4 w-4 rounded border-zinc-300"
                />
              </div>
              <div className="flex items-center justify-center">
                <input
                  type="checkbox"
                  checked={pref.email}
                  onChange={() => togglePref(i, "email")}
                  className="h-4 w-4 rounded border-zinc-300"
                />
              </div>
            </>
          ))}
        </div>
      </div>
    </div>
  );
}
