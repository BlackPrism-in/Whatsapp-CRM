"use client";

import { useState, useTransition } from "react";
import { syncPhoneNumbers, disconnectWaba } from "@/modules/whatsapp/actions";

export function SyncPhoneNumbersButton() {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await syncPhoneNumbers();
            setMsg(res?.error ?? res?.message ?? null);
          })
        }
        className="rounded-lg border border-border px-4 py-2 text-sm transition hover:bg-surface-subtle disabled:opacity-60"
      >
        {pending ? "Syncing…" : "Sync phone numbers"}
      </button>
      {msg && <span className="text-sm text-muted">{msg}</span>}
    </div>
  );
}

export function DisconnectWabaButton() {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm("Disconnect this WhatsApp Business Account?")) return;
        start(() => disconnectWaba());
      }}
      className="rounded-lg border border-danger/40 px-4 py-2 text-sm text-danger transition hover:bg-danger/10 disabled:opacity-60"
    >
      {pending ? "Disconnecting…" : "Disconnect"}
    </button>
  );
}
