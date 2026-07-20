"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteProduct, toggleAvailability } from "@/modules/products/actions";

export function ProductActions({
  id,
  isAvailable,
}: {
  id: string;
  isAvailable: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            await toggleAvailability(id, !isAvailable);
            router.refresh();
          })
        }
        className="text-sm text-brand-600 hover:underline disabled:opacity-50"
      >
        {isAvailable ? "Mark unavailable" : "Mark available"}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!confirm("Delete this product?")) return;
          start(async () => {
            await deleteProduct(id);
            router.refresh();
          });
        }}
        className="text-sm text-danger hover:underline disabled:opacity-50"
      >
        Delete
      </button>
    </div>
  );
}
