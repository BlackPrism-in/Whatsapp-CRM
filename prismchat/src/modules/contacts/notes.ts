"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireWorkspace, requireUser } from "@/lib/session";

export type NoteState = { error?: string; ok?: boolean } | undefined;

export async function addContactNote(
  contactId: string,
  _prev: NoteState,
  formData: FormData,
): Promise<NoteState> {
  const { workspace } = await requireWorkspace();
  const user = await requireUser();
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { error: "Write a note first" };

  const contact = await prisma.contact.findFirst({
    where: { id: contactId, workspaceId: workspace.id },
  });
  if (!contact) return { error: "Contact not found" };

  await prisma.internalNote.create({
    data: { workspaceId: workspace.id, contactId, userId: user.id, body },
  });

  revalidatePath(`/app/contacts/${contactId}`);
  return { ok: true };
}

export async function deleteContactNote(id: string, contactId: string): Promise<void> {
  const { workspace } = await requireWorkspace();
  await prisma.internalNote.deleteMany({ where: { id, workspaceId: workspace.id } });
  revalidatePath(`/app/contacts/${contactId}`);
}

export async function listContactNotes(workspaceId: string, contactId: string) {
  return prisma.internalNote.findMany({
    where: { workspaceId, contactId },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
}
