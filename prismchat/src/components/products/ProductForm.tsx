"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { saveProduct, type ProductState } from "@/modules/products/actions";
import { Field, inputClass } from "@/components/ui/Field";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-60"
    >
      {pending ? "Saving…" : label}
    </button>
  );
}

export function ProductForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const action = saveProduct.bind(null, null);
  const [state, formAction] = useActionState<ProductState, FormData>(action, undefined);

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      router.refresh();
    }
  }, [state, router]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4 rounded-xl border border-border bg-surface p-5">
      <h2 className="font-medium">Add product</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor="name">
          <input id="name" name="name" required placeholder="Chocolate truffle cake" className={inputClass} />
        </Field>
        <Field label="Category" htmlFor="category">
          <input id="category" name="category" placeholder="Cakes / Classes" className={inputClass} />
        </Field>
        <Field label="Price (₹)" htmlFor="price">
          <input id="price" name="price" type="number" step="0.01" min="0" defaultValue="0" className={inputClass} />
        </Field>
        <Field label="SKU (optional)" htmlFor="sku">
          <input id="sku" name="sku" className={inputClass} />
        </Field>
      </div>
      <Field label="Image URL (optional)" htmlFor="imageUrl">
        <input id="imageUrl" name="imageUrl" placeholder="https://…" className={inputClass} />
      </Field>
      <Field label="Description (optional)" htmlFor="description">
        <textarea id="description" name="description" rows={2} className={inputClass} />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isAvailable" defaultChecked />
        Available
      </label>

      {state?.error && (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{state.error}</p>
      )}
      <SubmitButton label="Add product" />
    </form>
  );
}
