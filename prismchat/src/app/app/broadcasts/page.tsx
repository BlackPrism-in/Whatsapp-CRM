import Link from "next/link";
import { requireWorkspace } from "@/lib/session";
import { listCampaigns } from "@/modules/broadcasting/queries";

const statusStyle: Record<string, string> = {
  draft: "bg-surface-subtle text-muted",
  scheduled: "bg-accent-200 text-accent-900",
  sending: "bg-accent-200 text-accent-900",
  paused: "bg-surface-subtle text-muted",
  completed: "bg-brand-100 text-brand-800",
  failed: "bg-danger/10 text-danger",
  canceled: "bg-surface-subtle text-muted",
};

export default async function BroadcastsPage() {
  const { workspace } = await requireWorkspace();
  const campaigns = await listCampaigns(workspace.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Broadcasts</h1>
          <p className="text-sm text-muted">WhatsApp campaigns to your contacts.</p>
        </div>
        <Link
          href="/app/broadcasts/new"
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
        >
          New campaign
        </Link>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Template</th>
              <th className="px-4 py-3 font-medium">Recipients</th>
              <th className="px-4 py-3 font-medium">Sent</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted">
                  No campaigns yet. Create one to broadcast to your contacts.
                </td>
              </tr>
            ) : (
              campaigns.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <Link href={`/app/broadcasts/${c.id}`} className="font-medium text-brand-700 hover:underline">
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{c.template?.name ?? "—"}</td>
                  <td className="px-4 py-3">{c.totalRecipients}</td>
                  <td className="px-4 py-3">{c.sentCount}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${statusStyle[c.status] ?? ""}`}>
                      {c.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
