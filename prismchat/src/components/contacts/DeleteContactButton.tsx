"use client";

import { useTransition } from "react";
import { deleteContact } from "@/modules/contacts/actions";

export function DeleteContactButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm("Delete this contact?")) return;
        startTransition(() => deleteContact(id));
      }}
      className="text-danger hover:underline disabled:opacity-50"
    >
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}
