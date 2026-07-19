import Link from "next/link";
import { ContactForm } from "@/components/contacts/ContactForm";
import { createContact } from "@/modules/contacts/actions";

export default function NewContactPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link href="/app/contacts" className="text-sm text-muted hover:underline">
          ← Contacts
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">Add contact</h1>
      </div>
      <ContactForm action={createContact} submitLabel="Create contact" />
    </div>
  );
}
