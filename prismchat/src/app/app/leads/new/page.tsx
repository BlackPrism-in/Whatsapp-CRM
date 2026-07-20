import Link from "next/link";
import { LeadForm } from "@/components/leads/LeadForm";
import { createLead } from "@/modules/leads/actions";

export default function NewLeadPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link href="/app/leads" className="text-sm text-muted hover:underline">
          ← Pipeline
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">Add lead</h1>
      </div>
      <LeadForm action={createLead} submitLabel="Create lead" />
    </div>
  );
}
