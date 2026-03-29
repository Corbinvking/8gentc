"use client";

import { useState } from "react";
import { Plus, MoreHorizontal, Mail } from "lucide-react";

interface Member {
  id: string;
  name: string;
  email: string;
  role: "owner" | "admin" | "member" | "viewer";
  avatarUrl?: string;
}

const roleLabels: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
  viewer: "Viewer",
};

const roleBadgeColors: Record<string, string> = {
  owner: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  admin: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  member: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400",
  viewer: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500",
};

export default function MembersPage() {
  const [inviteEmail, setInviteEmail] = useState("");

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="text-2xl font-bold tracking-tight">Team Members</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Manage who has access to this workspace
      </p>

      <div className="mt-8">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="Enter email to invite..."
              className="h-10 w-full rounded-md border border-zinc-200 bg-white pl-10 pr-4 text-sm placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:border-zinc-800 dark:bg-zinc-900"
            />
          </div>
          <button className="inline-flex h-10 items-center gap-2 rounded-md bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300">
            <Plus className="h-4 w-4" />
            Invite
          </button>
        </div>

        <div className="mt-6 rounded-lg border border-zinc-200 dark:border-zinc-800">
          <div className="px-4 py-3 text-sm font-medium text-zinc-500">
            Members will appear here once the workspace is connected.
          </div>
        </div>
      </div>
    </div>
  );
}
