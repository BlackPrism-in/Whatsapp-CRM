import { prisma } from "@/lib/prisma";

/** The workspace's primary connected WhatsApp Business Account (if any). */
export async function getWaba(workspaceId: string) {
  return prisma.whatsappBusinessAccount.findFirst({
    where: { workspaceId },
    include: { phoneNumbers: { orderBy: { createdAt: "asc" } } },
    orderBy: { createdAt: "asc" },
  });
}

export async function listTemplates(workspaceId: string) {
  return prisma.whatsappTemplate.findMany({
    where: { workspaceId },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getTemplate(workspaceId: string, id: string) {
  return prisma.whatsappTemplate.findFirst({ where: { id, workspaceId } });
}

export async function listAutoReplies(workspaceId: string) {
  return prisma.whatsappAutoReply.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
  });
}
