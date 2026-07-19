import { requireWorkspace } from "@/lib/session";
import { listAutoReplies } from "@/modules/whatsapp/queries";
import { WhatsappTabs } from "@/components/whatsapp/WhatsappTabs";
import { AutoReplyForm } from "@/components/whatsapp/AutoReplyForm";
import { DeleteAutoReplyButton } from "@/components/whatsapp/DeleteAutoReplyButton";

export default async function AutoRepliesPage() {
  const { workspace } = await requireWorkspace();
  const replies = await listAutoReplies(workspace.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">WhatsApp</h1>
        <p className="text-sm text-muted">
          Keyword auto-replies for inbound messages (within the 24-hour window).
        </p>
      </div>

      <WhatsappTabs />

      <div className="grid gap-6 lg:grid-cols-2">
        <AutoReplyForm />

        <div className="space-y-3">
          {replies.length === 0 ? (
            <p className="rounded-xl border border-border bg-surface p-5 text-sm text-muted">
              No auto-replies yet.
            </p>
          ) : (
            replies.map((r) => (
              <div key={r.id} className="rounded-xl border border-border bg-surface p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-surface-subtle px-2 py-0.5 text-xs font-medium">
                      {r.matchType}
                    </span>
                    <span className="font-medium">{r.trigger}</span>
                    {!r.isActive && (
                      <span className="rounded-full bg-surface-subtle px-2 py-0.5 text-xs text-muted">
                        inactive
                      </span>
                    )}
                  </div>
                  <DeleteAutoReplyButton id={r.id} />
                </div>
                <p className="mt-2 text-sm text-muted">{r.reply}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
