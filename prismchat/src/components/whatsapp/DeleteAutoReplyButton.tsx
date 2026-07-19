"use client";

import { useTransition } from "react";
import { deleteAutoReply } from "@/modules/whatsapp/actions";

export function DeleteAutoReplyButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(() => deleteAutoReply(id))}
      className="text-sm text-danger hover:underline disabled:opacity-50"
    >
      {pending ? "…" : "Delete"}
    </button>
  );
}
