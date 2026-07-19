"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/app/whatsapp", label: "Setup" },
  { href: "/app/whatsapp/templates", label: "Templates" },
  { href: "/app/whatsapp/auto-replies", label: "Auto-replies" },
];

export function WhatsappTabs() {
  const pathname = usePathname();
  return (
    <div className="flex gap-1 border-b border-border">
      {tabs.map((t) => {
        const active =
          t.href === "/app/whatsapp"
            ? pathname === t.href
            : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "-mb-px border-b-2 px-4 py-2 text-sm transition",
              active
                ? "border-brand-600 font-medium text-brand-700"
                : "border-transparent text-muted hover:text-foreground",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
