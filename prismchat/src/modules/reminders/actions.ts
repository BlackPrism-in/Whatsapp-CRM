"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireWorkspace } from "@/lib/session";

export type ReminderState = { error?: string; ok?: boolean } | undefined;

const reminderSchema = z.object({
  title: z.string().trim().min(1, "Enter a title").max(200),
  type: z.enum(["follow_up", "birthday", "class_reminder", "order", "renewal", "custom"]),
  dueAt: z.string().min(1, "Pick a due date"),
  contactId: z.string().optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export async function createReminder(
  _prev: ReminderState,
  formData: FormData,
): Promise<ReminderState> {
  const { workspace } = await requireWorkspace();
  const parsed = reminderSchema.safeParse({
    title: formData.get("title"),
    type: formData.get("type") ?? "follow_up",
    dueAt: formData.get("dueAt"),
    contactId: formData.get("contactId") ?? "",
    notes: formData.get("notes") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const dueAt = new Date(parsed.data.dueAt);
  if (Number.isNaN(dueAt.getTime())) return { error: "Invalid due date" };

  await prisma.reminder.create({
    data: {
      workspaceId: workspace.id,
      title: parsed.data.title,
      type: parsed.data.type,
      dueAt,
      contactId: parsed.data.contactId || null,
      notes: parsed.data.notes || null,
    },
  });

  revalidatePath("/app/reminders");
  return { ok: true };
}

export async function completeReminder(id: string): Promise<void> {
  const { workspace } = await requireWorkspace();
  await prisma.reminder.updateMany({
    where: { id, workspaceId: workspace.id },
    data: { completedAt: new Date() },
  });
  revalidatePath("/app/reminders");
}

export async function deleteReminder(id: string): Promise<void> {
  const { workspace } = await requireWorkspace();
  await prisma.reminder.deleteMany({ where: { id, workspaceId: workspace.id } });
  revalidatePath("/app/reminders");
}

export async function listReminders(workspaceId: string) {
  const [pending, completed] = await Promise.all([
    prisma.reminder.findMany({
      where: { workspaceId, completedAt: null },
      include: { contact: true },
      orderBy: { dueAt: "asc" },
    }),
    prisma.reminder.findMany({
      where: { workspaceId, completedAt: { not: null } },
      include: { contact: true },
      orderBy: { completedAt: "desc" },
      take: 20,
    }),
  ]);
  return { pending, completed };
}
