"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  MessageCircle,
  MessageSquare,
  Megaphone,
  Workflow,
  Bot,
  Target,
  ShoppingBag,
  BellRing,
  BarChart3,
  Share2,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  soon?: boolean;
};

// Nav mirrors the ported WhatsMine modules. Items marked `soon` land in later
// phases and render disabled until their routes exist.
const nav: NavItem[] = [
  { href: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/app/contacts", label: "Contacts", icon: Users },
  { href: "/app/whatsapp", label: "WhatsApp", icon: MessageCircle },
  { href: "/app/inbox", label: "Inbox", icon: MessageSquare },
  { href: "/app/broadcasts", label: "Broadcasts", icon: Megaphone },
  { href: "/app/automation", label: "Automation", icon: Workflow, soon: true },
  { href: "/app/ai", label: "AI Chatbots", icon: Bot, soon: true },
  { href: "/app/leads", label: "Leads", icon: Target },
  { href: "/app/products", label: "Products", icon: ShoppingBag },
  { href: "/app/reminders", label: "Reminders", icon: BellRing },
  { href: "/app/reports", label: "Reports", icon: BarChart3 },
  { href: "/app/social", label: "Social", icon: Share2, soon: true },
  { href: "/app/settings/team", label: "Team", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-surface md:flex">
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <span className="grid size-7 place-items-center rounded-lg bg-brand-600 text-sm font-bold text-white">
          P
        </span>
        <span className="font-semibold">PrismChat</span>
      </div>
      <nav className="flex-1 space-y-0.5 p-2">
        {nav.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          const base =
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition";

          if (item.soon) {
            return (
              <div
                key={item.href}
                className={cn(base, "cursor-not-allowed text-muted/60")}
                title="Coming soon"
              >
                <Icon className="size-4" />
                <span>{item.label}</span>
                <span className="ml-auto rounded bg-surface-subtle px-1.5 py-0.5 text-[10px] font-medium text-muted">
                  soon
                </span>
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                base,
                active
                  ? "bg-brand-600 text-white"
                  : "text-foreground hover:bg-surface-subtle",
              )}
            >
              <Icon className="size-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
