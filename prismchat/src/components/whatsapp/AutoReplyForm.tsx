"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { saveAutoReply, type WaState } from "@/modules/whatsapp/actions";
import { Field, inputClass } from "@/components/ui/Field";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-60"
    >
      {pending ? "Saving…" : "Add auto-reply"}
    </button>
  );
}

export function AutoReplyForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action] = useActionState<WaState, FormData>(saveAutoReply, undefined);

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      router.refresh();
    }
  }, [state, router]);

  return (
    <form ref={formRef} action={action} className="space-y-4 rounded-xl border border-border bg-surface p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Trigger keyword" htmlFor="trigger">
          <input id="trigger" name="trigger" placeholder="hours" className={inputClass} />
        </Field>
        <Field label="Match type" htmlFor="matchType">
          <select id="matchType" name="matchType" className={inputClass} defaultValue="contains">
            <option value="exact">Exact</option>
            <option value="contains">Contains</option>
            <option value="starts_with">Starts with</option>
          </select>
        </Field>
      </div>
      <Field label="Reply" htmlFor="reply">
        <textarea id="reply" name="reply" rows={3} className={inputClass} placeholder="We're open 9am–7pm, Mon–Sat." />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isActive" defaultChecked />
        Active
      </label>
      {state?.error && (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{state.error}</p>
      )}
      <SubmitButton />
    </form>
  );
}
