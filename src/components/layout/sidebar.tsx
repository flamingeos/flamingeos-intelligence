"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  BarChart3,
  Users,
  TrendingUp,
  FileText,
  Type,
  Image,
  Calendar,
  Bot,
  BookOpen,
  Bell,
  LogOut,
  Lightbulb,
} from "lucide-react";
import { signOut } from "next-auth/react";

const NAV = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Command Center", key: "home" },
  { href: "/analytics", icon: BarChart3, label: "Analytics", key: "analytics" },
  { href: "/competitors", icon: Users, label: "Competitors", key: "competitors" },
  { href: "/trends", icon: TrendingUp, label: "Trend Engine", key: "trends" },
  { href: "/scripts", icon: FileText, label: "Scripts", key: "scripts" },
  { href: "/titles", icon: Type, label: "Titles", key: "titles" },
  { href: "/thumbnails", icon: Image, label: "Thumbnails", key: "thumbnails" },
  { href: "/calendar", icon: Calendar, label: "Calendar", key: "calendar" },
  { href: "/ideas", icon: Lightbulb, label: "Ideas Board", key: "ideas" },
  { href: "/agents", icon: Bot, label: "AI Agents", key: "agents" },
  { href: "/knowledge", icon: BookOpen, label: "Knowledge", key: "knowledge" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 shrink-0 border-r border-[var(--border)] flex flex-col bg-[var(--bg)] h-screen sticky top-0 overflow-y-auto">
      {/* ASCII Logo */}
      <div className="p-4 border-b border-[var(--border)]">
        <div className="text-[var(--fg)] font-mono leading-tight text-xs text-glow">
          <pre>{`╔═══════════════╗
║  FLAMINGEOS   ║
║ INTELLIGENCE  ║
╚═══════════════╝`}</pre>
        </div>
        <div className="text-[var(--fg-muted)] text-xs mt-1 font-mono">
          v1.0.0 [ACTIVE]
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2">
        <div className="text-[var(--fg-muted)] text-xs px-4 py-2 uppercase tracking-widest">
          // nav --modules
        </div>
        {NAV.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.key}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-2 text-xs font-mono uppercase tracking-wider transition-all duration-100 group",
                isActive
                  ? "bg-[var(--fg)] text-[var(--bg)] border-l-2 border-[var(--fg)]"
                  : "text-[var(--fg-dim)] hover:text-[var(--fg)] hover:bg-[rgba(51,255,0,0.04)] border-l-2 border-transparent"
              )}
            >
              <item.icon
                className={cn(
                  "h-3.5 w-3.5 shrink-0",
                  isActive ? "text-[var(--bg)]" : "text-[var(--fg-muted)] group-hover:text-[var(--fg)]"
                )}
                strokeWidth={1.5}
              />
              <span>{isActive ? "> " : "  "}{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className="border-t border-[var(--border)] py-2">
        <div className="text-[var(--fg-muted)] text-xs px-4 py-1 uppercase tracking-widest">
          // sys --controls
        </div>
        <Link
          href="/notifications"
          className="flex items-center gap-3 px-4 py-2 text-xs font-mono uppercase tracking-wider text-[var(--fg-dim)] hover:text-[var(--fg)] transition-colors"
        >
          <Bell className="h-3.5 w-3.5 shrink-0 text-[var(--fg-muted)]" strokeWidth={1.5} />
          Notifications
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center gap-3 px-4 py-2 text-xs font-mono uppercase tracking-wider text-[var(--error)] hover:bg-[rgba(255,51,51,0.05)] transition-colors cursor-pointer"
        >
          <LogOut className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
          Disconnect
        </button>
      </div>
    </aside>
  );
}
