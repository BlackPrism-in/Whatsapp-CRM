"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireWorkspace, requireRole } from "@/lib/session";
import { encrypt, decrypt } from "@/lib/crypto";
import {
  verifyWaba,
  fetchPhoneNumbers,
  fetchTemplates,
  createTemplate as metaCreateTemplate,
} from "@/lib/whatsapp";
import {
  connectWabaSchema,
  createTemplateSchema,
  autoReplySchema,
  buildTemplateComponents,
} from "./schema";
import type { WhatsappTemplateStatus } from "@/generated/prisma/enums";

export type WaState = { error?: string; ok?: boolean; message?: string } | undefined;

/** Get the decrypted access token for the workspace's WABA. */
async function getWabaWithToken(workspaceId: string) {
  const waba = await prisma.whatsappBusinessAccount.findFirst({
    where: { workspaceId },
    orderBy: { createdAt: "asc" },
  });
  if (!waba) return null;
  return { waba, token: decrypt(waba.accessToken) };
}

export async function connectWaba(_prev: WaState, formData: FormData): Promise<WaState> {
  const { workspace } = await requireRole("admin");
  const parsed = connectWabaSchema.safeParse({
    name: formData.get("name"),
    wabaId: formData.get("wabaId"),
    accessToken: formData.get("accessToken"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const { name, wabaId, accessToken } = parsed.data;

  // Validate against Meta before storing.
  const check = await verifyWaba(wabaId, accessToken);
  if (!check.ok) {
    return { error: `Could not verify with Meta: ${check.error}` };
  }

  const existing = await prisma.whatsappBusinessAccount.findUnique({ where: { wabaId } });
  if (existing && existing.workspaceId !== workspace.id) {
    return { error: "This WhatsApp Business Account is already connected elsewhere" };
  }

  const verifyToken = crypto.randomBytes(24).toString("hex");
  const verifyTokenHash = crypto.createHash("sha256").update(verifyToken).digest("hex");

  const waba = await prisma.whatsappBusinessAccount.upsert({
    where: { wabaId },
    create: {
      workspaceId: workspace.id,
      wabaId,
      name: check.data.name ?? name,
      accessToken: encrypt(accessToken),
      webhookVerifyToken: verifyToken,
      webhookVerifyTokenHash: verifyTokenHash,
      status: "connected",
    },
    update: {
      name: check.data.name ?? name,
      accessToken: encrypt(accessToken),
      status: "connected",
    },
  });

  // Ensure a whatsapp ChannelAccount exists for the inbox/broadcasting layer.
  await prisma.channelAccount.upsert({
    where: { id: waba.id }, // deterministic: reuse waba id as channel account id
    create: {
      id: waba.id,
      workspaceId: workspace.id,
      channel: "whatsapp",
      provider: "meta_cloud",
      displayName: name,
      businessAccountId: wabaId,
      status: "active",
    },
    update: { status: "active", displayName: name },
  });

  // Pull phone numbers immediately.
  await syncPhoneNumbersInternal(workspace.id);

  revalidatePath("/app/whatsapp");
  return { ok: true, message: "WhatsApp Business Account connected." };
}

async function syncPhoneNumbersInternal(workspaceId: string) {
  const ctx = await getWabaWithToken(workspaceId);
  if (!ctx) return;
  const res = await fetchPhoneNumbers(ctx.waba.wabaId, ctx.token);
  if (!res.ok) return;

  for (const p of res.data.data) {
    await prisma.whatsappPhoneNumber.upsert({
      where: { phoneNumberId: p.id },
      create: {
        wabaId: ctx.waba.id,
        phoneNumberId: p.id,
        displayNumber: p.display_phone_number,
        name: p.verified_name ?? null,
        status: p.status ?? null,
        qualityRating: p.quality_rating ?? null,
      },
      update: {
        displayNumber: p.display_phone_number,
        name: p.verified_name ?? null,
        status: p.status ?? null,
        qualityRating: p.quality_rating ?? null,
      },
    });
  }
}

export async function syncPhoneNumbers(): Promise<WaState> {
  const { workspace } = await requireRole("admin");
  const ctx = await getWabaWithToken(workspace.id);
  if (!ctx) return { error: "Connect a WhatsApp Business Account first" };
  const res = await fetchPhoneNumbers(ctx.waba.wabaId, ctx.token);
  if (!res.ok) return { error: res.error };
  await syncPhoneNumbersInternal(workspace.id);
  revalidatePath("/app/whatsapp");
  return { ok: true, message: `Synced ${res.data.data.length} phone number(s).` };
}

export async function disconnectWaba(): Promise<void> {
  const { workspace } = await requireRole("admin");
  const waba = await prisma.whatsappBusinessAccount.findFirst({
    where: { workspaceId: workspace.id },
  });
  if (waba) {
    await prisma.whatsappBusinessAccount.delete({ where: { id: waba.id } });
    await prisma.channelAccount.deleteMany({
      where: { workspaceId: workspace.id, channel: "whatsapp" },
    });
  }
  revalidatePath("/app/whatsapp");
}

const META_TO_STATUS: Record<string, WhatsappTemplateStatus> = {
  APPROVED: "approved",
  PENDING: "pending",
  REJECTED: "rejected",
  PAUSED: "paused",
  DISABLED: "disabled",
};

export async function syncTemplates(): Promise<WaState> {
  const { workspace } = await requireRole("admin");
  const ctx = await getWabaWithToken(workspace.id);
  if (!ctx) return { error: "Connect a WhatsApp Business Account first" };

  const res = await fetchTemplates(ctx.waba.wabaId, ctx.token);
  if (!res.ok) return { error: res.error };

  for (const t of res.data.data) {
    await prisma.whatsappTemplate.upsert({
      where: {
        workspaceId_name_language: {
          workspaceId: workspace.id,
          name: t.name,
          language: t.language,
        },
      },
      create: {
        workspaceId: workspace.id,
        name: t.name,
        language: t.language,
        category: t.category,
        status: META_TO_STATUS[t.status] ?? "pending",
        components: t.components as object,
        providerId: t.id,
      },
      update: {
        category: t.category,
        status: META_TO_STATUS[t.status] ?? "pending",
        components: t.components as object,
        providerId: t.id,
      },
    });
  }

  revalidatePath("/app/whatsapp/templates");
  return { ok: true, message: `Synced ${res.data.data.length} template(s) from Meta.` };
}

export async function createTemplate(_prev: WaState, formData: FormData): Promise<WaState> {
  const { workspace } = await requireRole("admin");
  const parsed = createTemplateSchema.safeParse({
    name: formData.get("name"),
    language: formData.get("language"),
    category: formData.get("category"),
    body: formData.get("body"),
    header: formData.get("header") ?? "",
    footer: formData.get("footer") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const input = parsed.data;
  const components = buildTemplateComponents(input);

  const ctx = await getWabaWithToken(workspace.id);

  // Persist locally as draft/pending. If connected, submit to Meta for approval.
  let providerId: string | undefined;
  let status: WhatsappTemplateStatus = "draft";

  if (ctx) {
    const res = await metaCreateTemplate(ctx.waba.wabaId, ctx.token, {
      name: input.name,
      language: input.language,
      category: input.category,
      components,
    });
    if (!res.ok) return { error: `Meta rejected the template: ${res.error}` };
    providerId = res.data.id;
    status = "pending";
  }

  await prisma.whatsappTemplate.upsert({
    where: {
      workspaceId_name_language: {
        workspaceId: workspace.id,
        name: input.name,
        language: input.language,
      },
    },
    create: {
      workspaceId: workspace.id,
      name: input.name,
      language: input.language,
      category: input.category,
      status,
      components: components as object,
      providerId,
    },
    update: { category: input.category, components: components as object, status, providerId },
  });

  revalidatePath("/app/whatsapp/templates");
  return { ok: true, message: ctx ? "Template submitted to Meta for approval." : "Template saved as draft." };
}

export async function deleteTemplate(id: string): Promise<void> {
  const { workspace } = await requireRole("admin");
  await prisma.whatsappTemplate.deleteMany({ where: { id, workspaceId: workspace.id } });
  revalidatePath("/app/whatsapp/templates");
}

// -------- Auto-replies --------

export async function saveAutoReply(_prev: WaState, formData: FormData): Promise<WaState> {
  const { workspace } = await requireWorkspace();
  const parsed = autoReplySchema.safeParse({
    trigger: formData.get("trigger"),
    matchType: formData.get("matchType"),
    reply: formData.get("reply"),
    isActive: formData.get("isActive") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const id = formData.get("id");
  const data = {
    trigger: parsed.data.trigger,
    matchType: parsed.data.matchType,
    reply: parsed.data.reply,
    isActive: parsed.data.isActive ?? true,
  };

  if (id && typeof id === "string") {
    await prisma.whatsappAutoReply.updateMany({
      where: { id, workspaceId: workspace.id },
      data,
    });
  } else {
    await prisma.whatsappAutoReply.create({ data: { workspaceId: workspace.id, ...data } });
  }

  revalidatePath("/app/whatsapp/auto-replies");
  return { ok: true };
}

export async function deleteAutoReply(id: string): Promise<void> {
  const { workspace } = await requireWorkspace();
  await prisma.whatsappAutoReply.deleteMany({ where: { id, workspaceId: workspace.id } });
  revalidatePath("/app/whatsapp/auto-replies");
}
