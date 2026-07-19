"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { sendReply, type ReplyState } from "@/modules/inbox/actions";
import { inputClass } from "@/components/ui/Field";

function SendButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-brand-600 px-5 py-2.5 font-medium text-white transition hover:bg-brand-700 disabled:opacity-60"
    >
      {pending ? "Sending…" : "Send"}
    </button>
  );
}

export function ReplyForm({ conversationId }: { conversationId: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const action = sendReply.bind(null, conversationId);
  const [state, formAction] = useActionState<ReplyState, FormData>(action, undefined);

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      router.refresh();
    }
  }, [state, router]);

  return (
    <form ref={formRef} action={formAction} className="space-y-2">
      <div className="flex gap-2">
        <input
          name="body"
          placeholder="Type a reply…"
          autoComplete="off"
          className={inputClass}
        />
        <SendButton />
      </div>
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
    </form>
  );
}
