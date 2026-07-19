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
  { key: "contacts", label: "Total contacts" },
  { key: "openConversations", label: "Open conversations" },
  { key: "campaigns", label: "Campaigns" },
  { key: "conversations", label: "Conversations" },
] as const;

export default async function DashboardPage() {
  const { workspace } = await requireWorkspace();
  const stats = await getStats(workspace.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted">
          Overview of {workspace.name}&apos;s customer engagement.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div
            key={c.key}
            className="rounded-xl border border-border bg-surface p-5"
          >
            <div className="text-sm text-muted">{c.label}</div>
            <div className="mt-2 text-3xl font-semibold text-brand-700">
              {stats[c.key]}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-surface p-6">
        <h2 className="font-medium">Get started</h2>
        <p className="mt-1 text-sm text-muted">
          Connect your WhatsApp Business account, import contacts, and send your
          first broadcast. These modules arrive in Phase 1.
        </p>
      </div>
    </div>
  );
}
