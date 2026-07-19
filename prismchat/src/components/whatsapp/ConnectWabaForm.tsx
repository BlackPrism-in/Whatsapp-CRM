"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { connectWaba, type WaState } from "@/modules/whatsapp/actions";
import { Field, inputClass } from "@/components/ui/Field";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-brand-600 px-5 py-2.5 font-medium text-white transition hover:bg-brand-700 disabled:opacity-60"
    >
      {pending ? "Connecting…" : "Connect account"}
    </button>
  );
}

export function ConnectWabaForm() {
  const [state, action] = useActionState<WaState, FormData>(connectWaba, undefined);

  return (
    <form action={action} className="max-w-xl space-y-4">
      <Field label="Label (for your reference)" htmlFor="name">
        <input id="name" name="name" placeholder="Main WhatsApp line" className={inputClass} />
      </Field>
      <Field label="WhatsApp Business Account ID" htmlFor="wabaId">
        <input id="wabaId" name="wabaId" placeholder="123456789012345" className={inputClass} />
      </Field>
      <Field label="Permanent access token (System User token)" htmlFor="accessToken">
        <textarea
          id="accessToken"
          name="accessToken"
          rows={3}
          placeholder="EAAG…"
          className={inputClass}
        />
      </Field>
      <p className="text-xs text-muted">
        The token is verified against Meta, then encrypted at rest. Create a
        permanent token from a Meta System User with{" "}
        <code>whatsapp_business_management</code> and{" "}
        <code>whatsapp_business_messaging</code> permissions.
      </p>

      {state?.error && (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{state.error}</p>
      )}
      {state?.ok && (
        <p className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800">{state.message}</p>
      )}
      <SubmitButton />
    </form>
  );
}
