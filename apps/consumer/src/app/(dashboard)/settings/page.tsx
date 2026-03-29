"use client";

import Link from "next/link";
import { CreditCard, Users, Bell, Shield } from "lucide-react";

const settingsSections = [
  {
    name: "Billing & Subscription",
    description: "Manage your plan, view usage, and update payment methods",
    href: "/settings/billing",
    icon: CreditCard,
  },
  {
    name: "Team Members",
    description: "Invite and manage workspace members and their roles",
    href: "/settings/members",
    icon: Users,
  },
  {
    name: "Notifications",
    description: "Configure how and when you receive notifications",
    href: "/settings/notifications",
    icon: Bell,
  },
  {
    name: "Security",
    description: "Password, two-factor authentication, and active sessions",
    href: "/settings/security",
    icon: Shield,
  },
];

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Manage your workspace configuration
      </p>

      <div className="mt-8 space-y-3">
        {settingsSections.map((section) => (
          <Link
            key={section.name}
            href={section.href}
            className="flex items-center gap-4 rounded-lg border border-zinc-200 p-4 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
              <section.icon className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
            </div>
            <div>
              <h3 className="text-sm font-medium">{section.name}</h3>
              <p className="text-sm text-zinc-500">{section.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
