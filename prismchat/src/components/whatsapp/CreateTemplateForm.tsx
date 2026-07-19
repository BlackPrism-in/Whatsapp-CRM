"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { createTemplate, type WaState } from "@/modules/whatsapp/actions";
import { Field, inputClass } from "@/components/ui/Field";
import { TEMPLATE_CATEGORIES } from "@/modules/whatsapp/schema";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-brand-600 px-5 py-2.5 font-medium text-white transition hover:bg-brand-700 disabled:opacity-60"
    >
      {pending ? "Saving…" : "Save template"}
    </button>
  );
}

export function CreateTemplateForm() {
  const router = useRouter();
  const [state, action] = useActionState<WaState, FormData>(createTemplate, undefined);

  useEffect(() => {
    if (state?.ok) {
      const t = setTimeout(() => router.push("/app/whatsapp/templates"), 800);
      return () => clearTimeout(t);
    }
  }, [state, router]);

  return (
    <form action={action} className="max-w-2xl space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Template name (lowercase_with_underscores)" htmlFor="name">
          <input id="name" name="name" placeholder="diwali_offer" className={inputClass} />
        </Field>
        <Field label="Language" htmlFor="language">
          <input id="language" name="language" defaultValue="en" className={inputClass} />
        </Field>
      </div>

      <Field label="Category" htmlFor="category">
        <select id="category" name="category" className={inputClass} defaultValue="MARKETING">
          {TEMPLATE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Header (optional)" htmlFor="header">
        <input id="header" name="header" maxLength={60} className={inputClass} />
      </Field>

      <Field label="Body" htmlFor="body">
        <textarea id="body" name="body" rows={5} className={inputClass} placeholder="Hi {{1}}, enjoy 20% off our Diwali cake class!" />
      </Field>

      <Field label="Footer (optional)" htmlFor="footer">
        <input id="footer" name="footer" maxLength={60} className={inputClass} />
      </Field>

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
