"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { createReminder, type ReminderState } from "@/modules/reminders/actions";
import { REMINDER_TYPES } from "@/modules/reminders/constants";
import { Field, inputClass } from "@/components/ui/Field";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-60"
    >
      {pending ? "Saving…" : "Add reminder"}
    </button>
  );
}

export function ReminderForm({ contacts }: { contacts: { id: string; name: string }[] }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action] = useActionState<ReminderState, FormData>(createReminder, undefined);

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      router.refresh();
    }
  }, [state, router]);

  return (
    <form ref={formRef} action={action} className="space-y-4 rounded-xl border border-border bg-surface p-5">
      <h2 className="font-medium">New reminder</h2>
      <Field label="Title" htmlFor="title">
        <input id="title" name="title" required placeholder="Call about Diwali class booking" className={inputClass} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Type" htmlFor="type">
          <select id="type" name="type" defaultValue="follow_up" className={inputClass}>
            {REMINDER_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Due" htmlFor="dueAt">
          <input id="dueAt" name="dueAt" type="datetime-local" required className={inputClass} />
        </Field>
      </div>
      <Field label="Contact (optional)" htmlFor="contactId">
        <select id="contactId" name="contactId" defaultValue="" className={inputClass}>
          <option value="">— none —</option>
          {contacts.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </Field>
      <Field label="Notes (optional)" htmlFor="notes">
        <textarea id="notes" name="notes" rows={2} className={inputClass} />
      </Field>

      {state?.error && (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{state.error}</p>
      )}
      <SubmitButton />
    </form>
  );
}
