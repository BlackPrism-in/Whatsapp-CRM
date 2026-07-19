import Link from "next/link";
import { notFound } from "next/navigation";
import { requireWorkspace } from "@/lib/session";
import { getContact } from "@/modules/contacts/queries";

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
