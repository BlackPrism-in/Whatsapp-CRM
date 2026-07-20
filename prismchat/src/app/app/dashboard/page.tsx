import Link from "next/link";
import { Users, MessageSquare, Megaphone, Inbox } from "lucide-react";
import { requireWorkspace } from "@/lib/session";
import { prisma } from "@/lib/prisma";

async function getStats(workspaceId: string) {
  const [contacts, conversations, campaigns, openConversations] =
    await Promise.all([
      prisma.contact.count({ where: { workspaceId, deletedAt: null } }),
      prisma.conversation.count({ where: { workspaceId } }),
      prisma.campaign.count({ where: { workspaceId } }),
      prisma.conversation.count({ where: { workspaceId, status: "open" } }),
    ]);
  return { contacts, conversations, campaigns, openConversations };
}

const cards = [
  { key: "contacts", label: "Total contacts", icon: Users, hint: "in your workspace" },
  { key: "openConversations", label: "Open conversations", icon: Inbox, hint: "awaiting reply" },
  { key: "campaigns", label: "Campaigns", icon: Megaphone, hint: "created" },
  { key: "conversations", label: "Conversations", icon: MessageSquare, hint: "all time" },
] as const;

const quickLinks = [
  { href: "/app/contacts/import", label: "Import contacts", desc: "Upload a CSV/Excel of your customers" },
  { href: "/app/whatsapp", label: "Connect WhatsApp", desc: "Link your WhatsApp Business account" },
  { href: "/app/broadcasts/new", label: "New broadcast", desc: "Send a campaign to your contacts" },
  { href: "/app/leads/new", label: "Add a lead", desc: "Start tracking a sales opportunity" },
];

export default async function DashboardPage() {
  const { workspace } = await requireWorkspace();
  const stats = await getStats(workspace.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted">
          Overview of {workspace.name}&apos;s customer engagement.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div
              key={c.key}
              className="flex flex-col justify-between rounded-xl border border-border bg-surface p-4 shadow-sm transition hover:border-brand-300"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="truncate text-xs font-medium uppercase tracking-wide text-muted">
                  {c.label}
                </p>
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-100 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400">
                  <Icon className="size-4" />
                </span>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-bold tabular-nums">{stats[c.key]}</p>
                <p className="mt-0.5 text-xs text-muted">{c.hint}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
        <h2 className="font-semibold">Get started</h2>
        <p className="mt-1 text-sm text-muted">
          A few steps to get the most out of PrismChat.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {quickLinks.map((q) => (
            <Link
              key={q.href}
              href={q.href}
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-4 py-3 transition hover:border-brand-300 hover:bg-surface-subtle"
            >
              <div>
                <div className="text-sm font-medium">{q.label}</div>
                <div className="text-xs text-muted">{q.desc}</div>
              </div>
              <span className="text-brand-600">→</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
