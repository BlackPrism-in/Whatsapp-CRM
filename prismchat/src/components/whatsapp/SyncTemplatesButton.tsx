"use client";

import { useState, useTransition } from "react";
import { syncTemplates } from "@/modules/whatsapp/actions";

export function SyncTemplatesButton() {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await syncTemplates();
            setMsg(res?.error ?? res?.message ?? null);
          })
        }
        className="rounded-lg border border-border px-4 py-2 text-sm transition hover:bg-surface-subtle disabled:opacity-60"
      >
        {pending ? "Syncing…" : "Sync from Meta"}
      </button>
      {msg && <span className="text-sm text-muted">{msg}</span>}
    </div>
  );
}
