"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import {
  LayoutDashboard,
  ListTodo,
  Calendar,
  Wrench,
  BarChart3,
  Trophy,
  DollarSign,
  User,
  Settings,
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Tasks", href: "/tasks", icon: ListTodo },
  { name: "Schedule", href: "/schedule", icon: Calendar },
  { name: "Workspace", href: "/workspace", icon: Wrench },
  { name: "Performance", href: "/performance", icon: BarChart3 },
  { name: "Leaderboard", href: "/leaderboard", icon: Trophy },
  { name: "Earnings", href: "/earnings", icon: DollarSign },
  { name: "Profile", href: "/profile", icon: User },
  { name: "Settings", href: "/settings", icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen bg-[var(--color-background)]">
      <aside className="hidden w-64 flex-shrink-0 border-r border-[var(--color-border)] bg-[var(--color-card)] md:flex md:flex-col">
        <div className="flex h-16 items-center border-b border-[var(--color-border)] px-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold">8gent</span>
            <span className="rounded-full bg-[var(--color-primary)] px-2 py-0.5 text-xs font-medium text-[var(--color-primary-foreground)]">
              Contractor
            </span>
          </Link>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navigation.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
                    : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-card)] px-6">
          <div className="flex items-center gap-4 md:hidden">
            <span className="text-lg font-bold">8gent</span>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-4">
            <UserButton afterSignOutUrl="/sign-in" />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
