import { requireWorkspace } from "@/lib/session";
import { getReports } from "@/modules/reports/queries";

const stageLabels: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  converted: "Won",
  lost: "Lost",
};

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="text-sm text-muted">{label}</div>
      <div className="mt-1 text-3xl font-semibold text-brand-700">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
    </div>
  );
}

export default async function ReportsPage() {
  const { workspace } = await requireWorkspace();
  const r = await getReports(workspace.id);
  const pct = (n: number) => `${n.toFixed(1)}%`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Reports</h1>
          <p className="text-sm text-muted">Performance across {workspace.name}.</p>
        </div>
        <a
          href="/api/reports/export"
          className="rounded-lg border border-border px-4 py-2 text-sm transition hover:bg-surface-subtle"
        >
          Export campaigns (CSV)
        </a>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total contacts" value={r.contacts.total} hint={`${r.contacts.new30d} new in 30 days`} />
        <Stat label="Reachable on WhatsApp" value={r.contacts.optedIn} hint="opted in with a phone number" />
        <Stat label="Conversations" value={r.conversations.total} hint={`${r.conversations.open} open`} />
        <Stat label="Products" value={r.products} />
      </div>

      <div className="rounded-xl border border-border bg-surface p-5">
        <h2 className="mb-4 font-medium">Broadcast performance</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat label="Delivery rate" value={pct(r.rates.deliveryRate)} hint={`${r.totals.delivered} of ${r.totals.sent} sent`} />
          <Stat label="Read rate" value={pct(r.rates.readRate)} hint={`${r.totals.read} read`} />
          <Stat label="Reply rate" value={pct(r.rates.replyRate)} hint={`${r.totals.replied} replied`} />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <h2 className="border-b border-border px-5 py-3 font-medium">Campaigns</h2>
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-muted">
            <tr>
              <th className="px-5 py-2 font-medium">Name</th>
              <th className="px-5 py-2 font-medium">Status</th>
              <th className="px-5 py-2 font-medium">Recipients</th>
              <th className="px-5 py-2 font-medium">Sent</th>
              <th className="px-5 py-2 font-medium">Delivered</th>
              <th className="px-5 py-2 font-medium">Read</th>
              <th className="px-5 py-2 font-medium">Failed</th>
            </tr>
          </thead>
          <tbody>
            {r.campaigns.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-muted">
                  No campaigns yet.
                </td>
              </tr>
            ) : (
              r.campaigns.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-2 font-medium">{c.name}</td>
                  <td className="px-5 py-2">{c.status}</td>
                  <td className="px-5 py-2">{c.totalRecipients}</td>
                  <td className="px-5 py-2">{c.sentCount}</td>
                  <td className="px-5 py-2">{c.deliveredCount}</td>
                  <td className="px-5 py-2">{c.readCount}</td>
                  <td className="px-5 py-2">{c.failedCount}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-5">
          <h2 className="mb-3 font-medium">Sales pipeline</h2>
          {r.leadsByStage.length === 0 ? (
            <p className="text-sm text-muted">No leads yet.</p>
          ) : (
            <div className="space-y-2">
              {r.leadsByStage.map((l) => (
                <div key={l.stage} className="flex items-center justify-between text-sm">
                  <span>{stageLabels[l.stage] ?? l.stage}</span>
                  <span className="font-medium text-brand-700">{l.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border bg-surface p-5">
          <h2 className="mb-3 font-medium">Top tags</h2>
          {r.topTags.length === 0 ? (
            <p className="text-sm text-muted">No tags yet.</p>
          ) : (
            <div className="space-y-2">
              {r.topTags.map((t) => (
                <div key={t.name} className="flex items-center justify-between text-sm">
                  <span
                    className="rounded-full px-2 py-0.5 text-xs"
                    style={{ backgroundColor: `${t.color}22`, color: t.color }}
                  >
                    {t.name}
                  </span>
                  <span className="font-medium">{t.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
