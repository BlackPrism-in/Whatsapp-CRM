"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { importContacts } from "@/modules/contacts/actions";
import type { ImportResult } from "@/modules/contacts/import";
import { inputClass } from "@/components/ui/Field";

export function ImportForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setResult(null);
    const res = await importContacts(formData);
    setResult(res);
    setPending(false);
    if (!res.error) router.refresh();
  }

  return (
    <div className="max-w-xl space-y-5">
      <div className="rounded-xl border border-border bg-surface p-5 text-sm text-muted">
        <p className="font-medium text-foreground">CSV format</p>
        <p className="mt-1">
          First row must be headers. Recognized columns:{" "}
          <code className="text-foreground">first_name, last_name, phone, email, country, tags</code>.
          Tags can be separated with <code>;</code> or <code>|</code>. Rows with a
          phone number already in your workspace are skipped.
        </p>
      </div>

      <form action={onSubmit} className="space-y-4">
        <input
          type="file"
          name="file"
          accept=".csv,text/csv"
          required
          className={inputClass}
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-brand-600 px-5 py-2.5 font-medium text-white transition hover:bg-brand-700 disabled:opacity-60"
        >
          {pending ? "Importing…" : "Import contacts"}
        </button>
      </form>

      {result?.error && (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{result.error}</p>
      )}
      {result && !result.error && (
        <div className="rounded-lg bg-brand-50 px-4 py-3 text-sm text-brand-800">
          Imported <b>{result.imported}</b> contacts.{" "}
          {result.duplicates ? <>Skipped <b>{result.duplicates}</b> duplicates. </> : null}
          {result.skipped ? <>Skipped <b>{result.skipped}</b> invalid rows.</> : null}
        </div>
      )}
    </div>
  );
}
