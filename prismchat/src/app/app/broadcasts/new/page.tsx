import Link from "next/link";
import { requireWorkspace } from "@/lib/session";
import { listApprovedTemplates } from "@/modules/broadcasting/queries";
import { listWorkspaceTags } from "@/modules/contacts/queries";
import { prisma } from "@/lib/prisma";
import { CampaignForm } from "@/components/broadcasting/CampaignForm";

export default async function NewCampaignPage() {
  const { workspace } = await requireWorkspace();
  const [templates, tags, segments] = await Promise.all([
    listApprovedTemplates(workspace.id),
    listWorkspaceTags(workspace.id),
    prisma.segment.findMany({ where: { workspaceId: workspace.id }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/app/broadcasts" className="text-sm text-muted hover:underline">
          ← Broadcasts
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">New campaign</h1>
      </div>
      <CampaignForm
        templates={templates.map((t) => ({ id: t.id, name: `${t.name} (${t.status})` }))}
        segments={segments.map((s) => ({ id: s.id, name: s.name }))}
        tags={tags.map((t) => ({ id: t.id, name: t.name }))}
      />
    </div>
  );
}
