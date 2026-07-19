"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireWorkspace } from "@/lib/session";
import { decrypt } from "@/lib/crypto";
import { sendTextMessage } from "@/lib/whatsapp";

export type ReplyState = { error?: string; ok?: boolean } | undefined;

/** Send an agent reply on a conversation (free-form text, 24h window). */
export async function sendReply(
  conversationId: string,
  _prev: ReplyState,
  formData: FormData,
): Promise<ReplyState> {
  const { workspace } = await requireWorkspace();
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { error: "Type a message" };

  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, workspaceId: workspace.id },
    include: { contact: true },
  });
  if (!conversation) return { error: "Conversation not found" };
  if (!conversation.contact.phoneE164) return { error: "Contact has no phone number" };

  const waba = await prisma.whatsappBusinessAccount.findFirst({
    where: { workspaceId: workspace.id },
    include: { phoneNumbers: { take: 1, orderBy: { createdAt: "asc" } } },
  });
  const phone = waba?.phoneNumbers[0];

  let status: "sent" | "failed" | "queued" = "queued";
  let providerMessageId: string | null = null;
  let error: string | undefined;

  if (waba && phone) {
    const res = await sendTextMessage(
      phone.phoneNumberId,
      decrypt(waba.accessToken),
      conversation.contact.phoneE164,
      body,
    );
    if (res.ok) {
      status = "sent";
      providerMessageId = res.data.messages?.[0]?.id ?? null;
    } else {
      status = "failed";
      error = res.error;
    }
  } else {
    status = "failed";
    error = "No WhatsApp sender configured";
  }

  await prisma.message.create({
    data: {
      conversationId,
      direction: "out",
      channel: "whatsapp",
      type: "text",
      body,
      status,
      providerMessageId,
      sentBy: "human",
      sentAt: new Date(),
    },
  });
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { lastMessageAt: new Date(), firstResponseAt: conversation.firstResponseAt ?? new Date() },
  });

  revalidatePath(`/app/inbox/${conversationId}`);
  return error ? { error } : { ok: true };
}

/** Mark a conversation read (clear unread badge). */
export async function markRead(conversationId: string): Promise<void> {
  const { workspace } = await requireWorkspace();
  await prisma.conversation.updateMany({
    where: { id: conversationId, workspaceId: workspace.id },
    data: { unreadCount: 0 },
  });
}

export async function setConversationStatus(
  conversationId: string,
  status: "open" | "pending" | "resolved" | "snoozed",
): Promise<void> {
  const { workspace } = await requireWorkspace();
  await prisma.conversation.updateMany({
    where: { id: conversationId, workspaceId: workspace.id },
    data: { status, resolvedAt: status === "resolved" ? new Date() : null },
  });
  revalidatePath(`/app/inbox/${conversationId}`);
  revalidatePath("/app/inbox");
}
