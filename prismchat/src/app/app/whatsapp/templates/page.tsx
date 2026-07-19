import Link from "next/link";
import { requireWorkspace } from "@/lib/session";
import { listTemplates } from "@/modules/whatsapp/queries";
import { WhatsappTabs } from "@/components/whatsapp/WhatsappTabs";
import { SyncTemplatesButton } from "@/components/whatsapp/SyncTemplatesButton";
import { DeleteTemplateButton } from "@/components/whatsapp/DeleteTemplateButton";

const statusStyle: Record<string, string> = {
  approved: "bg-brand-100 text-brand-800",
  pending: "bg-accent-200 text-accent-900",
  draft: "bg-surface-subtle text-muted",
  rejected: "bg-danger/10 text-danger",
  paused: "bg-accent-200 text-accent-900",
  disabled: "bg-surface-subtle text-muted",
};

export default async function TemplatesPage() {
  const { workspace } = await requireWorkspace();
  const templates = await listTemplates(workspace.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">WhatsApp</h1>
        <p className="text-sm text-muted">Message templates for broadcasts and notifications.</p>
      </div>

      <WhatsappTabs />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <SyncTemplatesButton />
        <Link
          href="/app/whatsapp/templates/new"
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
        >
          New template
        </Link>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Language</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {templates.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted">
                  No templates yet. Create one, or sync approved templates from Meta.
                </td>
              </tr>
            ) : (
              templates.map((t) => (
                <tr key={t.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium">{t.name}</td>
                  <td className="px-4 py-3">{t.language}</td>
                  <td className="px-4 py-3">{t.category}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${statusStyle[t.status] ?? ""}`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <DeleteTemplateButton id={t.id} />
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
