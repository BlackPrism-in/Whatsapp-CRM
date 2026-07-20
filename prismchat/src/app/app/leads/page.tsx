import Link from "next/link";
import { requireWorkspace } from "@/lib/session";
import { getPipeline } from "@/modules/leads/queries";
import { PipelineColumn } from "@/components/leads/PipelineColumn";

export default async function LeadsPage() {
  const { workspace } = await requireWorkspace();
  const { columns, total } = await getPipeline(workspace.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Sales pipeline</h1>
          <p className="text-sm text-muted">
            {total} lead{total === 1 ? "" : "s"} · drag cards between stages
          </p>
        </div>
        <Link
          href="/app/leads/new"
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
        >
          Add lead
        </Link>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2">
        {columns.map((col) => (
          <PipelineColumn key={col.value} label={col.label} value={col.value} leads={col.leads} />
        ))}
      </div>
    </div>
  );
}
