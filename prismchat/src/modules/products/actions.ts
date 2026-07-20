"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireWorkspace } from "@/lib/session";

export type ProductState = { error?: string; ok?: boolean } | undefined;

const productSchema = z.object({
  name: z.string().trim().min(1, "Enter a product name").max(200),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  sku: z.string().trim().max(64).optional().or(z.literal("")),
  price: z.coerce.number().min(0, "Price cannot be negative"),
  category: z.string().trim().max(64).optional().or(z.literal("")),
  imageUrl: z.string().trim().url("Enter a valid image URL").optional().or(z.literal("")),
  isAvailable: z.coerce.boolean().optional(),
});

function parse(formData: FormData) {
  return productSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    sku: formData.get("sku") ?? "",
    price: formData.get("price") ?? 0,
    category: formData.get("category") ?? "",
    imageUrl: formData.get("imageUrl") ?? "",
    isAvailable: formData.get("isAvailable") === "on",
  });
}

export async function listProducts(workspaceId: string, category?: string) {
  return prisma.product.findMany({
    where: { workspaceId, ...(category ? { category } : {}) },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
}

export async function saveProduct(
  id: string | null,
  _prev: ProductState,
  formData: FormData,
): Promise<ProductState> {
  const { workspace } = await requireWorkspace();
  const parsed = parse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const d = parsed.data;

  const data = {
    name: d.name,
    description: d.description || null,
    sku: d.sku || null,
    price: d.price,
    category: d.category || null,
    imageUrl: d.imageUrl || null,
    isAvailable: d.isAvailable ?? true,
    currency: workspace.currency,
  };

  if (id) {
    const updated = await prisma.product.updateMany({
      where: { id, workspaceId: workspace.id },
      data,
    });
    if (updated.count === 0) return { error: "Product not found" };
  } else {
    await prisma.product.create({ data: { workspaceId: workspace.id, ...data } });
  }

  revalidatePath("/app/products");
  return { ok: true };
}

export async function deleteProduct(id: string): Promise<void> {
  const { workspace } = await requireWorkspace();
  await prisma.product.deleteMany({ where: { id, workspaceId: workspace.id } });
  revalidatePath("/app/products");
}

export async function toggleAvailability(id: string, isAvailable: boolean): Promise<void> {
  const { workspace } = await requireWorkspace();
  await prisma.product.updateMany({
    where: { id, workspaceId: workspace.id },
    data: { isAvailable },
  });
  revalidatePath("/app/products");
}
