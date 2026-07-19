"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Field, inputClass } from "@/components/ui/Field";
import type { ContactActionState } from "@/modules/contacts/actions";

type Defaults = {
  firstName?: string | null;
  lastName?: string | null;
  phoneE164?: string | null;
  email?: string | null;
  country?: string | null;
  language?: string | null;
  source?: string | null;
  optInWhatsapp?: boolean;
  optInSms?: boolean;
  optInEmail?: boolean;
  tags?: string[];
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

export function ContactForm({
  action,
  defaults,
  submitLabel = "Save contact",
}: {
  action: (state: ContactActionState, formData: FormData) => Promise<ContactActionState>;
  defaults?: Defaults;
  submitLabel?: string;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(action, undefined);

  useEffect(() => {
    if (state?.ok) router.push("/app/contacts");
  }, [state, router]);

  return (
    <form action={formAction} className="max-w-2xl space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="First name" htmlFor="firstName">
          <input id="firstName" name="firstName" defaultValue={defaults?.firstName ?? ""} className={inputClass} />
        </Field>
        <Field label="Last name" htmlFor="lastName">
          <input id="lastName" name="lastName" defaultValue={defaults?.lastName ?? ""} className={inputClass} />
        </Field>
        <Field label="Phone (international, e.g. +919876543210)" htmlFor="phoneE164">
          <input id="phoneE164" name="phoneE164" defaultValue={defaults?.phoneE164 ?? ""} className={inputClass} />
        </Field>
        <Field label="Email" htmlFor="email">
          <input id="email" name="email" type="email" defaultValue={defaults?.email ?? ""} className={inputClass} />
        </Field>
        <Field label="Country (ISO, e.g. IN)" htmlFor="country">
          <input id="country" name="country" defaultValue={defaults?.country ?? ""} className={inputClass} />
        </Field>
        <Field label="Language (e.g. en)" htmlFor="language">
          <input id="language" name="language" defaultValue={defaults?.language ?? ""} className={inputClass} />
        </Field>
      </div>

      <Field label="Tags (comma-separated)" htmlFor="tags">
        <input
          id="tags"
          name="tags"
          defaultValue={(defaults?.tags ?? []).join(", ")}
          placeholder="cake, class, bulk-order"
          className={inputClass}
        />
      </Field>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Opt-ins</legend>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="optInWhatsapp" defaultChecked={defaults?.optInWhatsapp ?? true} />
          WhatsApp
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="optInSms" defaultChecked={defaults?.optInSms ?? false} />
          SMS
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="optInEmail" defaultChecked={defaults?.optInEmail ?? true} />
          Email
        </label>
      </fieldset>

      {state?.error && (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{state.error}</p>
      )}

      <div className="flex items-center gap-3">
        <SaveButton label={submitLabel} />
        <button
          type="button"
          onClick={() => router.push("/app/contacts")}
          className="rounded-lg border border-border px-5 py-2.5 transition hover:bg-surface-subtle"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
