"use client";

import { useTransition } from "react";
import { deleteTemplate } from "@/modules/whatsapp/actions";

export function DeleteTemplateButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm("Delete this template?")) return;
        start(() => deleteTemplate(id));
      }}
      className="text-danger hover:underline disabled:opacity-50"
    >
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}
