"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Check } from "lucide-react";

interface NotificationPreference {
  type: string;
  label: string;
  description: string;
  inApp: boolean;
  chat: boolean;
  email: boolean;
}

const typeLabels: Record<string, { label: string; description: string }> = {
  goal_nudge: {
    label: "Goal Nudges",
    description: "Reminders about goals that need action plans or updates",
  },
  agent_finding: {
    label: "Agent Findings",
    description: "When your agents discover something relevant",
  },
  stale_content: {
    label: "Stale Content Alerts",
    description: "Reminders about notes that haven't been updated",
  },
  system: {
    label: "System Notifications",
    description: "Agent errors, billing alerts, and account updates",
  },
};

export default function NotificationPreferencesPage() {
  const [prefs, setPrefs] = useState<NotificationPreference[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/notifications/preferences")
      .then((res) => res.json())
      .then(
        (
          data: Array<{
            type: string;
            inApp: boolean;
            chat: boolean;
            email: boolean;
          }>
        ) => {
          setPrefs(
            data.map((d) => ({
              ...d,
              label: typeLabels[d.type]?.label ?? d.type,
              description: typeLabels[d.type]?.description ?? "",
            }))
          );
        }
      )
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const togglePref = (
    index: number,
    channel: "inApp" | "chat" | "email"
  ) => {
    setPrefs((prev) =>
      prev.map((p, i) => (i === index ? { ...p, [channel]: !p[channel] } : p))
    );
    setSaved(false);
  };

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await fetch("/api/notifications/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          prefs.map((p) => ({
            type: p.type,
            inApp: p.inApp,
            chat: p.chat,
            email: p.email,
          }))
        ),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  }, [prefs]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-zinc-400">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading preferences...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Notification Preferences
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Choose how you want to be notified
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : saved ? (
            <Check className="h-4 w-4" />
          ) : null}
          {saved ? "Saved" : "Save"}
        </button>
      </div>

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
            <div key={pref.type} className="contents">
              <div className="py-3">
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
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
