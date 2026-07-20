"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { inviteMember, type TeamState } from "@/modules/team/actions";
import { Field, inputClass } from "@/components/ui/Field";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-60"
    >
      {pending ? "Inviting…" : "Send invite"}
    </button>
  );
}

export function InviteForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action] = useActionState<TeamState, FormData>(inviteMember, undefined);

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      router.refresh();
    }
  }, [state, router]);

  return (
    <form ref={formRef} action={action} className="space-y-4 rounded-xl border border-border bg-surface p-5">
      <h2 className="font-medium">Invite a teammate</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Email" htmlFor="email">
          <input id="email" name="email" type="email" required placeholder="staff@yourshop.com" className={inputClass} />
        </Field>
        <Field label="Role" htmlFor="role">
          <select id="role" name="role" defaultValue="staff" className={inputClass}>
            <option value="staff">Staff</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
          </select>
        </Field>
      </div>

      {state?.error && (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{state.error}</p>
      )}
      {state?.ok && state.message && (
        <div className="space-y-2 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800">
          <p>{state.message}</p>
          {state.inviteUrl && (
            <code className="block break-all rounded bg-surface-subtle px-2 py-1 text-xs text-foreground">
              {state.inviteUrl}
            </code>
          )}
        </div>
      )}

      <SubmitButton />
    </form>
  );
}
