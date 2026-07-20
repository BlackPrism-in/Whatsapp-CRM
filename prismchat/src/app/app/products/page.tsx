import { requireWorkspace } from "@/lib/session";
import { listProducts } from "@/modules/products/actions";
import { ProductForm } from "@/components/products/ProductForm";
import { ProductActions } from "@/components/products/ProductActions";

export default async function ProductsPage() {
  const { workspace } = await requireWorkspace();
  const products = await listProducts(workspace.id);

  const byCategory = products.reduce<Record<string, typeof products>>((acc, p) => {
    const key = p.category ?? "Uncategorised";
    (acc[key] ||= []).push(p);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Products</h1>
        <p className="text-sm text-muted">
          {products.length} item{products.length === 1 ? "" : "s"} in your catalog
        </p>
      </div>

      <ProductForm />

      {products.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-10 text-center text-muted">
          No products yet. Add your cakes, classes or bundles above.
        </div>
      ) : (
        Object.entries(byCategory).map(([category, items]) => (
          <div key={category} className="rounded-xl border border-border bg-surface">
            <h2 className="border-b border-border px-5 py-3 font-medium">{category}</h2>
            <div className="divide-y divide-border">
              {items.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-4 px-5 py-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{p.name}</span>
                      {!p.isAvailable && (
                        <span className="rounded-full bg-surface-subtle px-2 py-0.5 text-xs text-muted">
                          unavailable
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-muted">
                      ₹{Number(p.price).toLocaleString("en-IN")}
                      {p.sku ? ` · ${p.sku}` : ""}
                    </div>
                    {p.description && (
                      <p className="mt-0.5 truncate text-sm text-muted">{p.description}</p>
                    )}
                  </div>
                  <ProductActions id={p.id} isAvailable={p.isAvailable} />
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
