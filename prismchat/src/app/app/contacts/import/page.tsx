import Link from "next/link";
import { ImportForm } from "@/components/contacts/ImportForm";

export default function ImportContactsPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link href="/app/contacts" className="text-sm text-muted hover:underline">
          ← Contacts
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">Import contacts</h1>
      </div>
      <ImportForm />
    </div>
  );
}
