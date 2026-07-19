import Link from "next/link";
import { CreateTemplateForm } from "@/components/whatsapp/CreateTemplateForm";

export default function NewTemplatePage() {
  return (
    <div className="space-y-6">
      <div>
        <Link href="/app/whatsapp/templates" className="text-sm text-muted hover:underline">
          ← Templates
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">New template</h1>
        <p className="text-sm text-muted">
          If a WhatsApp account is connected, this is submitted to Meta for
          approval. Otherwise it&apos;s saved as a draft.
        </p>
      </div>
      <CreateTemplateForm />
    </div>
  );
}
