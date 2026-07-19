import Link from "next/link";
import { notFound } from "next/navigation";
import { requireWorkspace } from "@/lib/session";
import { getContact } from "@/modules/contacts/queries";
import { updateContact } from "@/modules/contacts/actions";
import { ContactForm } from "@/components/contacts/ContactForm";

export default async function EditContactPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { workspace } = await requireWorkspace();
  const contact = await getContact(workspace.id, id);
  if (!contact) notFound();

  const boundAction = updateContact.bind(null, id);

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/app/contacts/${id}`} className="text-sm text-muted hover:underline">
          ← Back to contact
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">Edit contact</h1>
      </div>
      <ContactForm
        action={boundAction}
        submitLabel="Save changes"
        defaults={{
          firstName: contact.firstName,
          lastName: contact.lastName,
          phoneE164: contact.phoneE164,
          email: contact.email,
          country: contact.country,
          language: contact.language,
          source: contact.source,
          optInWhatsapp: contact.optInWhatsapp,
          optInSms: contact.optInSms,
          optInEmail: contact.optInEmail,
          tags: contact.tags.map((t) => t.tag.name),
        }}
      />
    </div>
  );
}
