import Link from "next/link";
import { notFound } from "next/navigation";
import { requireWorkspace } from "@/lib/session";
import { getConversation } from "@/modules/inbox/queries";
import { markRead } from "@/modules/inbox/actions";
import { ReplyForm } from "@/components/inbox/ReplyForm";
import { ConversationStatusButton } from "@/components/inbox/ConversationStatusButton";
import { cn } from "@/lib/utils";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { workspace } = await requireWorkspace();
  const conversation = await getConversation(workspace.id, id);
  if (!conversation) notFound();

  // Clear unread badge on open.
  if (conversation.unreadCount > 0) await markRead(id);

  const name =
    [conversation.contact.firstName, conversation.contact.lastName].filter(Boolean).join(" ") ||
    conversation.contact.phoneE164 ||
    "Unknown";

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/app/inbox" className="text-sm text-muted hover:underline">
            ← Inbox
          </Link>
          <h1 className="mt-1 text-xl font-semibold">{name}</h1>
          <p className="text-sm text-muted">{conversation.contact.phoneE164}</p>
        </div>
        <ConversationStatusButton id={conversation.id} status={conversation.status} />
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto rounded-xl border border-border bg-surface p-4">
        {conversation.messages.length === 0 ? (
          <p className="text-center text-sm text-muted">No messages yet.</p>
        ) : (
          conversation.messages.map((m) => (
            <div
              key={m.id}
              className={cn("flex", m.direction === "out" ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[75%] rounded-2xl px-3 py-2 text-sm",
                  m.direction === "out"
                    ? "bg-brand-600 text-white"
                    : "bg-surface-subtle text-foreground",
                )}
              >
                <p>{m.body}</p>
                <div
                  className={cn(
                    "mt-1 text-[10px]",
                    m.direction === "out" ? "text-white/70" : "text-muted",
                  )}
                >
                  {m.sentBy === "automation" ? "auto · " : ""}
                  {m.status}
                  {" · "}
                  {new Date(m.createdAt).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <ReplyForm conversationId={conversation.id} />
    </div>
  );
}
