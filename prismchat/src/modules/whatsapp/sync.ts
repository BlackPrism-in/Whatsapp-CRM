import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import { fetchTemplates } from "@/lib/whatsapp";
import type { WhatsappTemplateStatus } from "@/generated/prisma/enums";

const META_TO_STATUS: Record<string, WhatsappTemplateStatus> = {
  APPROVED: "approved",
  PENDING: "pending",
  REJECTED: "rejected",
  PAUSED: "paused",
  DISABLED: "disabled",
};

/**
 * Pull templates from Meta into the local store.
 *
 * Takes the WABA's internal id (not Meta's `wabaId`) so the background worker
 * can run it without any session context.
 */
export async function syncTemplatesForWaba(
  id: string,
): Promise<{ synced: number } | { error: string }> {
  const waba = await prisma.whatsappBusinessAccount.findUnique({ where: { id } });
  if (!waba) return { error: "WhatsApp account not found" };

  let token: string;
  try {
    token = decrypt(waba.accessToken);
  } catch {
    return { error: "Stored credentials could not be read" };
  }

  const res = await fetchTemplates(waba.wabaId, token);
  if (!res.ok) return { error: res.error };

  for (const t of res.data.data) {
    await prisma.whatsappTemplate.upsert({
      where: {
        workspaceId_name_language: {
          workspaceId: waba.workspaceId,
          name: t.name,
          language: t.language,
        },
      },
      create: {
        workspaceId: waba.workspaceId,
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

  return { synced: res.data.data.length };
}
