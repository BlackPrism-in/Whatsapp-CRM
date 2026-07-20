"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireWorkspace } from "@/lib/session";
import { normalizePhone } from "@/modules/contacts/schema";
import { leadSchema, leadStageValues, type LeadStage } from "./schema";

export type LeadState = { error?: string; ok?: boolean; id?: string } | undefined;

function parseLead(formData: FormData) {
  return leadSchema.safeParse({
    name: formData.get("name") ?? "",
    phone: formData.get("phone") ?? "",
    email: formData.get("email") ?? "",
    company: formData.get("company") ?? "",
    source: formData.get("source") ?? "",
    status: formData.get("status") ?? "new",
    score: formData.get("score") ?? 0,
  });
}

export async function createLead(_prev: LeadState, formData: FormData): Promise<LeadState> {
  const { workspace } = await requireWorkspace();
  const parsed = parseLead(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const d = parsed.data;

  const lead = await prisma.lead.create({
    data: {
      workspaceId: workspace.id,
      name: d.name || null,
      phone: normalizePhone(d.phone),
      email: d.email || null,
      company: d.company || null,
      source: d.source || "manual",
      status: d.status,
      score: d.score ?? 0,
    },
  });

  revalidatePath("/app/leads");
  return { ok: true, id: lead.id };
}

export async function updateLead(
  id: string,
  _prev: LeadState,
  formData: FormData,
): Promise<LeadState> {
  const { workspace } = await requireWorkspace();
  const parsed = parseLead(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const d = parsed.data;

  const updated = await prisma.lead.updateMany({
    where: { id, workspaceId: workspace.id },
    data: {
      name: d.name || null,
      phone: normalizePhone(d.phone),
      email: d.email || null,
      company: d.company || null,
      source: d.source || null,
      status: d.status,
      score: d.score ?? 0,
    },
  });
  if (updated.count === 0) return { error: "Lead not found" };

  revalidatePath("/app/leads");
  return { ok: true, id };
}

/** Move a lead to another pipeline stage (Kanban drag/move). */
export async function moveLeadStage(id: string, status: string): Promise<void> {
  const { workspace } = await requireWorkspace();
  if (!leadStageValues.includes(status as LeadStage)) return;
  await prisma.lead.updateMany({
    where: { id, workspaceId: workspace.id },
    data: { status: status as LeadStage },
  });
  revalidatePath("/app/leads");
}

export async function deleteLead(id: string): Promise<void> {
  const { workspace } = await requireWorkspace();
  await prisma.lead.deleteMany({ where: { id, workspaceId: workspace.id } });
  revalidatePath("/app/leads");
}

/**
 * Convert a lead into a Contact (linked back via Contact.leadId) so it can be
 * messaged and included in broadcasts. Idempotent on phone within workspace.
 */
export async function convertLeadToContact(id: string): Promise<LeadState> {
  const { workspace } = await requireWorkspace();
  const lead = await prisma.lead.findFirst({ where: { id, workspaceId: workspace.id } });
  if (!lead) return { error: "Lead not found" };
  if (!lead.phone && !lead.email) return { error: "Lead needs a phone or email to convert" };

  const phone = normalizePhone(lead.phone);
  if (phone) {
    const existing = await prisma.contact.findFirst({
      where: { workspaceId: workspace.id, phoneE164: phone, deletedAt: null },
    });
    if (existing) {
      await prisma.contact.update({ where: { id: existing.id }, data: { leadId: lead.id } });
      await prisma.lead.update({ where: { id }, data: { status: "converted" } });
      revalidatePath("/app/leads");
      return { ok: true, id: existing.id };
    }
  }

  const [first, ...rest] = (lead.name ?? "").split(" ");
  const contact = await prisma.contact.create({
    data: {
      workspaceId: workspace.id,
      firstName: first || null,
      lastName: rest.join(" ") || null,
      phoneE164: phone,
      email: lead.email,
      source: `lead:${lead.source ?? "manual"}`,
      optInWhatsapp: !!phone,
      leadId: lead.id,
    },
  });

  await prisma.lead.update({ where: { id }, data: { status: "converted" } });
  revalidatePath("/app/leads");
  revalidatePath("/app/contacts");
  return { ok: true, id: contact.id };
}
