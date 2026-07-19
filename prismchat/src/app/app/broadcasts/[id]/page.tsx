import Link from "next/link";
import { notFound } from "next/navigation";
import { requireWorkspace } from "@/lib/session";
import { getCampaign, getCampaignStats } from "@/modules/broadcasting/queries";
import { CampaignActions } from "@/components/broadcasting/CampaignActions";

const metrics = [
  { key: "sent", label: "Sent" },
  { key: "delivered", label: "Delivered" },
  { key: "read", label: "Read" },
  { key: "replied", label: "Replied" },
  { key: "failed", label: "Failed" },
  { key: "pending", label: "Pending" },
] as const;

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { workspace } = await requireWorkspace();
  const campaign = await getCampaign(workspace.id, id);
  if (!campaign) notFound();
  const stats = await getCampaignStats(campaign.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/app/broadcasts" className="text-sm text-muted hover:underline">
            ← Broadcasts
          </Link>
          <h1 className="mt-1 text-2xl font-semibold">{campaign.name}</h1>
          <p className="text-sm text-muted">
            Template: {campaign.template?.name ?? "—"} · Status:{" "}
            <span className="font-medium">{campaign.status}</span> ·{" "}
            {campaign.totalRecipients} recipients
          </p>
        </div>
        <CampaignActions id={campaign.id} status={campaign.status} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {metrics.map((m) => (
          <div key={m.key} className="rounded-xl border border-border bg-surface p-4">
            <div className="text-xs text-muted">{m.label}</div>
            <div className="mt-1 text-2xl font-semibold text-brand-700">{stats[m.key]}</div>
          </div>
        ))}
      </div>

      {campaign.status === "sending" && (
        <p className="text-sm text-muted">
          Sending in progress — refresh to see updated counts.
        </p>
      )}
    </div>
  );
}
