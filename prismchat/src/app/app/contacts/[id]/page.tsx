import Link from "next/link";
import { notFound } from "next/navigation";
import { requireWorkspace } from "@/lib/session";
import { getContact } from "@/modules/contacts/queries";
import { getContactIntelligence } from "@/modules/contacts/intelligence";
import { listContactNotes } from "@/modules/contacts/notes";
import { NotesPanel } from "@/components/contacts/NotesPanel";

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border py-2 last:border-0">
      <span className="text-sm text-muted">{label}</span>
      <span className="text-sm font-medium">{value || "—"}</span>
    </div>
  );
}

export default async function ContactShowPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { workspace } = await requireWorkspace();
  const contact = await getContact(workspace.id, id);
  if (!contact) notFound();

  const [intel, notes] = await Promise.all([
    getContactIntelligence(workspace.id, id),
    listContactNotes(workspace.id, id),
  ]);

  const name = [contact.firstName, contact.lastName].filter(Boolean).join(" ") || "Unnamed contact";
  const optIns = [
    contact.optInWhatsapp && "WhatsApp",
    contact.optInSms && "SMS",
    contact.optInEmail && "Email",
  ].filter(Boolean).join(", ");

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/app/contacts" className="text-sm text-muted hover:underline">
            ← Contacts
          </Link>
          <h1 className="mt-1 text-2xl font-semibold">{name}</h1>
        </div>
        <Link
          href={`/app/contacts/${id}/edit`}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
        >
          Edit
        </Link>
      </div>

      <div className="rounded-xl border border-border bg-surface p-5">
        <Row label="Phone" value={contact.phoneE164} />
        <Row label="Email" value={contact.email} />
        <Row label="Country" value={contact.country} />
        <Row label="Language" value={contact.language} />
        <Row label="Source" value={contact.source} />
        <Row label="Opt-ins" value={optIns || "None"} />
        <Row label="Created" value={contact.createdAt.toLocaleDateString()} />
      </div>

      <div className="rounded-xl border border-border bg-surface p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-medium">Customer intelligence</h2>
          <span className="rounded-full bg-brand-100 px-2.5 py-1 text-xs font-medium text-brand-800">
            {intel.engagementLabel} · {intel.engagementScore}/100
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-surface-subtle">
          <div
            className="h-full rounded-full bg-brand-600 transition-all"
            style={{ width: `${intel.engagementScore}%` }}
          />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Messages in", value: intel.messagesIn },
            { label: "Messages out", value: intel.messagesOut },
            { label: "Campaigns", value: intel.campaignsReceived },
            { label: "Replied", value: intel.campaignsReplied },
            { label: "Orders", value: intel.orderCount },
            {
              label: "Lifetime value",
              value: `₹${intel.lifetimeValue.toLocaleString("en-IN")}`,
            },
            {
              label: "Avg order",
              value: `₹${Math.round(intel.avgOrderValue).toLocaleString("en-IN")}`,
            },
            {
              label: "Last inbound",
              value: intel.lastInboundAt
                ? new Date(intel.lastInboundAt).toLocaleDateString()
                : "—",
            },
          ].map((s) => (
            <div key={s.label}>
              <div className="text-xs text-muted">{s.label}</div>
              <div className="mt-0.5 text-lg font-semibold text-brand-700">{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      <NotesPanel contactId={id} notes={notes} />

      {contact.tags.length > 0 && (
        <div className="rounded-xl border border-border bg-surface p-5">
          <h2 className="mb-3 text-sm font-medium">Tags</h2>
          <div className="flex flex-wrap gap-1.5">
            {contact.tags.map((t) => (
              <span
                key={t.tagId}
                className="rounded-full px-2.5 py-1 text-xs"
                style={{ backgroundColor: `${t.tag.color}22`, color: t.tag.color }}
              >
                {t.tag.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
