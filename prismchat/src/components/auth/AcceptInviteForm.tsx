"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { acceptInvite, type AcceptState } from "@/app/accept-invite/[token]/actions";
import { Field, inputClass } from "@/components/ui/Field";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-brand-600 px-4 py-2.5 font-medium text-white transition hover:bg-brand-700 disabled:opacity-60"
    >
      {pending ? "Setting up…" : "Set password & continue"}
    </button>
  );
}

export function AcceptInviteForm({ token }: { token: string }) {
  const action = acceptInvite.bind(null, token);
  const [state, formAction] = useActionState<AcceptState, FormData>(action, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <Field label="Your name" htmlFor="name">
        <input id="name" name="name" autoComplete="name" required className={inputClass} />
      </Field>
      <Field label="Choose a password" htmlFor="password">
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          className={inputClass}
        />
      </Field>
      {state?.error && (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{state.error}</p>
      )}
      <SubmitButton />
    </form>
  );
}
