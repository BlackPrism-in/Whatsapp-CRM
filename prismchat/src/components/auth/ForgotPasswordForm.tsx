"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { requestPasswordReset, type ResetState } from "@/app/(auth)/reset-actions";
import { Field, inputClass } from "@/components/ui/Field";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-brand-600 px-4 py-2.5 font-medium text-white transition hover:bg-brand-700 disabled:opacity-60"
    >
      {pending ? "Sending…" : "Send reset link"}
    </button>
  );
}

export function ForgotPasswordForm() {
  const [state, action] = useActionState<ResetState, FormData>(requestPasswordReset, undefined);

  if (state?.sent) {
    return (
      <div className="space-y-4">
        <p className="rounded-lg bg-brand-50 px-3 py-3 text-sm text-brand-800">
          If an account exists for that email, a reset link is on its way. Check
          your inbox (and spam).
        </p>
        <Link href="/login" className="block text-center text-sm font-medium text-brand-600">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <Field label="Email" htmlFor="email">
        <input id="email" name="email" type="email" autoComplete="email" required className={inputClass} />
      </Field>
      {state?.error && (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{state.error}</p>
      )}
      <SubmitButton />
      <Link href="/login" className="block text-center text-sm text-muted hover:text-foreground">
        Back to sign in
      </Link>
    </form>
  );
}
