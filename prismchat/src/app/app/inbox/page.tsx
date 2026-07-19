import Link from "next/link";
import { requireWorkspace } from "@/lib/session";
import { listConversations } from "@/modules/inbox/queries";

function contactName(c: { firstName: string | null; lastName: string | null; phoneE164: string | null }) {
  return [c.firstName, c.lastName].filter(Boolean).join(" ") || c.phoneE164 || "Unknown";
}

export default async function InboxPage() {
  const { workspace } = await requireWorkspace();
  const conversations = await listConversations(workspace.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Inbox</h1>
        <p className="text-sm text-muted">Conversations with your customers.</p>
      </div>

      {conversations.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-10 text-center text-muted">
          No conversations yet. Inbound WhatsApp messages will appear here.
        </div>
      ) : (
        <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
          {conversations.map((c) => (
            <Link
              key={c.id}
              href={`/app/inbox/${c.id}`}
              className="flex items-center justify-between gap-4 px-4 py-3 transition hover:bg-surface-subtle"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{contactName(c.contact)}</span>
                  {c.unreadCount > 0 && (
                    <span className="rounded-full bg-brand-600 px-1.5 text-xs text-white">
                      {c.unreadCount}
                    </span>
                  )}
                  <span className="rounded-full bg-surface-subtle px-2 py-0.5 text-xs text-muted">
                    {c.status}
                  </span>
                </div>
                <p className="truncate text-sm text-muted">
                  {c.messages[0]?.body ?? "No messages"}
                </p>
              </div>
              <span className="shrink-0 text-xs text-muted">
                {c.lastMessageAt ? new Date(c.lastMessageAt).toLocaleString() : ""}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
