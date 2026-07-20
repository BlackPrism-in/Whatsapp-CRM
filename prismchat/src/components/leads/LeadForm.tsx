"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Field, inputClass } from "@/components/ui/Field";
import { LEAD_STAGES } from "@/modules/leads/schema";
import type { LeadState } from "@/modules/leads/actions";

type Defaults = {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  company?: string | null;
  source?: string | null;
  status?: string;
  score?: number;
};

function SaveButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-brand-600 px-5 py-2.5 font-medium text-white transition hover:bg-brand-700 disabled:opacity-60"
    >
      {pending ? "Saving…" : label}
    </button>
  );
}

export function LeadForm({
  action,
  defaults,
  submitLabel = "Save lead",
}: {
  action: (state: LeadState, formData: FormData) => Promise<LeadState>;
  defaults?: Defaults;
  submitLabel?: string;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState<LeadState, FormData>(action, undefined);

  useEffect(() => {
    if (state?.ok) router.push("/app/leads");
  }, [state, router]);

  return (
    <form action={formAction} className="max-w-2xl space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor="name">
          <input id="name" name="name" defaultValue={defaults?.name ?? ""} className={inputClass} />
        </Field>
        <Field label="Company" htmlFor="company">
          <input id="company" name="company" defaultValue={defaults?.company ?? ""} className={inputClass} />
        </Field>
        <Field label="Phone" htmlFor="phone">
          <input id="phone" name="phone" defaultValue={defaults?.phone ?? ""} className={inputClass} />
        </Field>
        <Field label="Email" htmlFor="email">
          <input id="email" name="email" type="email" defaultValue={defaults?.email ?? ""} className={inputClass} />
        </Field>
        <Field label="Source" htmlFor="source">
          <input id="source" name="source" defaultValue={defaults?.source ?? ""} placeholder="walk-in, instagram, referral" className={inputClass} />
        </Field>
        <Field label="Stage" htmlFor="status">
          <select id="status" name="status" defaultValue={defaults?.status ?? "new"} className={inputClass}>
            {LEAD_STAGES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Score (0–100)" htmlFor="score">
        <input
          id="score"
          name="score"
          type="number"
          min={0}
          max={100}
          defaultValue={defaults?.score ?? 0}
          className={inputClass}
        />
      </Field>

      {state?.error && (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{state.error}</p>
      )}

      <div className="flex gap-3">
        <SaveButton label={submitLabel} />
        <button
          type="button"
          onClick={() => router.push("/app/leads")}
          className="rounded-lg border border-border px-5 py-2.5 transition hover:bg-surface-subtle"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
