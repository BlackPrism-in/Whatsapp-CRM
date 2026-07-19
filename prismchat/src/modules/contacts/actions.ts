"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireWorkspace } from "@/lib/session";
import { contactSchema, normalizePhone } from "./schema";
import { importContactRows, type ImportResult } from "./import";

export type ContactActionState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  ok?: boolean;
} | undefined;

/** Resolve tag names to tag ids within a workspace, creating any that are new. */
async function resolveTagIds(workspaceId: string, names: string[]) {
  const clean = [...new Set(names.map((n) => n.trim()).filter(Boolean))];
  const ids: string[] = [];
  for (const name of clean) {
    const tag = await prisma.contactTag.upsert({
      where: { workspaceId_name: { workspaceId, name } },
      create: { workspaceId, name },
      update: {},
    });
    ids.push(tag.id);
  }
  return ids;
}

function parseForm(formData: FormData) {
  return contactSchema.safeParse({
    firstName: formData.get("firstName") ?? "",
    lastName: formData.get("lastName") ?? "",
    phoneE164: formData.get("phoneE164") ?? "",
    email: formData.get("email") ?? "",
    country: formData.get("country") ?? "",
    language: formData.get("language") ?? "",
    source: formData.get("source") ?? "",
    optInWhatsapp: formData.get("optInWhatsapp") === "on",
    optInSms: formData.get("optInSms") === "on",
    optInEmail: formData.get("optInEmail") === "on",
    tags: String(formData.get("tags") ?? "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
  });
}

export async function createContact(
  _prev: ContactActionState,
  formData: FormData,
): Promise<ContactActionState> {
  const { workspace } = await requireWorkspace();
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const d = parsed.data;
  const phone = normalizePhone(d.phoneE164);

  if (phone) {
    const dup = await prisma.contact.findFirst({
      where: { workspaceId: workspace.id, phoneE164: phone, deletedAt: null },
    });
    if (dup) return { error: "A contact with that phone number already exists" };
  }

  const tagIds = await resolveTagIds(workspace.id, d.tags ?? []);

  await prisma.contact.create({
    data: {
      workspaceId: workspace.id,
      firstName: d.firstName || null,
      lastName: d.lastName || null,
      phoneE164: phone,
      email: d.email || null,
      country: d.country || null,
      language: d.language || null,
      source: d.source || "manual",
      optInWhatsapp: !!d.optInWhatsapp,
      optInSms: !!d.optInSms,
      optInEmail: d.optInEmail ?? true,
      tags: { create: tagIds.map((tagId) => ({ tagId })) },
    },
  });

  revalidatePath("/app/contacts");
  return { ok: true };
}

export async function updateContact(
  id: string,
  _prev: ContactActionState,
  formData: FormData,
): Promise<ContactActionState> {
  const { workspace } = await requireWorkspace();
  const existing = await prisma.contact.findFirst({
    where: { id, workspaceId: workspace.id, deletedAt: null },
  });
  if (!existing) return { error: "Contact not found" };

  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const d = parsed.data;
  const phone = normalizePhone(d.phoneE164);
  const tagIds = await resolveTagIds(workspace.id, d.tags ?? []);

  await prisma.$transaction([
    prisma.contactTagPivot.deleteMany({ where: { contactId: id } }),
    prisma.contact.update({
      where: { id },
      data: {
        firstName: d.firstName || null,
        lastName: d.lastName || null,
        phoneE164: phone,
        email: d.email || null,
        country: d.country || null,
        language: d.language || null,
        source: d.source || existing.source,
        optInWhatsapp: !!d.optInWhatsapp,
        optInSms: !!d.optInSms,
        optInEmail: d.optInEmail ?? true,
        tags: { create: tagIds.map((tagId) => ({ tagId })) },
      },
    }),
  ]);

  revalidatePath("/app/contacts");
  revalidatePath(`/app/contacts/${id}`);
  return { ok: true };
}

export async function deleteContact(id: string): Promise<void> {
  const { workspace } = await requireWorkspace();
  await prisma.contact.updateMany({
    where: { id, workspaceId: workspace.id },
    data: { deletedAt: new Date() },
  });
  revalidatePath("/app/contacts");
}

/**
 * Server action: validate the uploaded CSV file, then delegate to the pure
 * import core. Deduped against existing workspace phone numbers.
 */
export async function importContacts(formData: FormData): Promise<ImportResult> {
  const { workspace } = await requireWorkspace();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Please choose a CSV file" };
  }
  if (file.size > 10 * 1024 * 1024) {
    return { error: "File too large (max 10MB)" };
  }

  const text = await file.text();
  const result = await importContactRows(workspace.id, text);
  revalidatePath("/app/contacts");
  return result;
}
