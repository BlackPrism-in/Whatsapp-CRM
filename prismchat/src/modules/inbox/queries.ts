import { prisma } from "@/lib/prisma";

/** Conversation list for the inbox, newest activity first. */
export async function listConversations(workspaceId: string) {
  return prisma.conversation.findMany({
    where: { workspaceId },
    include: {
      contact: true,
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }],
    take: 100,
  });
}

export async function getConversation(workspaceId: string, id: string) {
  return prisma.conversation.findFirst({
    where: { id, workspaceId },
    include: {
      contact: true,
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
}
