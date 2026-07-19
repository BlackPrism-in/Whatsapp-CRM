"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setConversationStatus } from "@/modules/inbox/actions";

export function ConversationStatusButton({
  id,
  status,
}: {
  id: string;
  status: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const next = status === "resolved" ? "open" : "resolved";

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(async () => { await setConversationStatus(id, next); router.refresh(); })}
      className="rounded-lg border border-border px-3 py-1.5 text-sm transition hover:bg-surface-subtle disabled:opacity-60"
    >
      {pending ? "…" : next === "resolved" ? "Mark resolved" : "Reopen"}
    </button>
  );
}
