"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { completeReminder, deleteReminder } from "@/modules/reminders/actions";

export function ReminderActions({ id, done }: { id: string; done: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <div className="flex shrink-0 items-center gap-3">
      {!done && (
        <button
          type="button"
          disabled={pending}
          onClick={() => start(async () => { await completeReminder(id); router.refresh(); })}
          className="text-sm text-brand-600 hover:underline disabled:opacity-50"
        >
          {pending ? "…" : "Done"}
        </button>
      )}
      <button
        type="button"
        disabled={pending}
        onClick={() => start(async () => { await deleteReminder(id); router.refresh(); })}
        className="text-sm text-danger hover:underline disabled:opacity-50"
      >
        Delete
      </button>
    </div>
  );
}
