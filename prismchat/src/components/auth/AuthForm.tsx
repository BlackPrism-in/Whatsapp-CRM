"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { ActionState } from "@/app/(auth)/actions";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-brand-600 px-4 py-2.5 font-medium text-white transition hover:bg-brand-700 disabled:opacity-60"
    >
      {pending ? "Please wait…" : label}
    </button>
  );
}

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30";

type Field = { name: string; label: string; type?: string; autoComplete?: string };

export function AuthForm({
  action,
  fields,
  submitLabel,
  hidden,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  fields: Field[];
  submitLabel: string;
  hidden?: Record<string, string>;
}) {
  const [state, formAction] = useActionState(action, undefined);

  return (
    <form action={formAction} className="space-y-4">
      {hidden &&
        Object.entries(hidden).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
      {fields.map((f) => (
        <div key={f.name} className="space-y-1">
          <label htmlFor={f.name} className="text-sm font-medium">
            {f.label}
          </label>
          <input
            id={f.name}
            name={f.name}
            type={f.type ?? "text"}
            autoComplete={f.autoComplete}
            required
            className={inputClass}
          />
        </div>
      ))}
      {state?.error && (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}
      <SubmitButton label={submitLabel} />
    </form>
  );
}
