import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import { sendTextMessage } from "@/lib/whatsapp";
import { pusher, workspaceChannel } from "@/lib/pusher";
import type { MessageStatus } from "@/generated/prisma/enums";

// Minimal shapes for the parts of the Meta webhook payload we consume.
type MetaValue = {
  metadata?: { phone_number_id?: string };
  contacts?: { profile?: { name?: string }; wa_id?: string }[];
  messages?: {
    from: string;
    id: string;
    timestamp?: string;
    type: string;
    text?: { body?: string };
  }[];
  statuses?: {
    id: string;
    status: string;
    recipient_id?: string;
    timestamp?: string;
  }[];
};

type MetaWebhookBody = {
  entry?: { changes?: { field?: string; value?: MetaValue }[] }[];
};

const STATUS_MAP: Record<string, MessageStatus> = {
  sent: "sent",
  delivered: "delivered",
  read: "read",
  failed: "failed",
};

/** Process a full Meta webhook body: inbound messages + delivery statuses. */
export async function processWebhook(body: MetaWebhookBody): Promise<void> {
  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "messages" || !change.value) continue;
      const value = change.value;
      const phoneNumberId = value.metadata?.phone_number_id;
      if (!phoneNumberId) continue;

      const phone = await prisma.whatsappPhoneNumber.findUnique({
        where: { phoneNumberId },
        include: { waba: true },
      });
      if (!phone) continue;
      const workspaceId = phone.waba.workspaceId;

      for (const msg of value.messages ?? []) {
        await handleInboundMessage(workspaceId, phone.wabaId, value, msg);
      }
      for (const status of value.statuses ?? []) {
        await handleStatus(status);
      }
    }
  }
}

async function handleInboundMessage(
  workspaceId: string,
  wabaId: string,
  value: MetaValue,
  msg: NonNullable<MetaValue["messages"]>[number],
) {
  const waId = msg.from;
  const profileName = value.contacts?.find((c) => c.wa_id === waId)?.profile?.name;

  // Upsert contact by phone within the workspace.
  const phoneE164 = waId.startsWith("+") ? waId : `+${waId}`;
  let contact = await prisma.contact.findFirst({
    where: { workspaceId, phoneE164, deletedAt: null },
  });
  if (!contact) {
    contact = await prisma.contact.create({
      data: {
        workspaceId,
        phoneE164,
        firstName: profileName ?? null,
        optInWhatsapp: true,
        source: "whatsapp_inbound",
      },
    });
  }

  const channelAccount = await prisma.channelAccount.findFirst({
    where: { workspaceId, channel: "whatsapp" },
  });

  // Find or create an open conversation for this contact.
  let conversation = await prisma.conversation.findFirst({
    where: { workspaceId, contactId: contact.id },
    orderBy: { createdAt: "desc" },
  });
  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        workspaceId,
        contactId: contact.id,
        channelAccountId: channelAccount?.id,
        status: "open",
      },
    });
  }

  const body = msg.type === "text" ? msg.text?.body ?? "" : `[${msg.type}]`;

  const message = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      direction: "in",
      channel: "whatsapp",
      type: msg.type === "text" ? "text" : "document",
      body,
      status: "delivered",
      providerMessageId: msg.id,
      sentBy: "human",
      sentAt: new Date(),
    },
  });

  await prisma.conversation.update({
    where: { id: conversation.id },
    data: {
      lastMessageAt: new Date(),
      lastInboundAt: new Date(),
      unreadCount: { increment: 1 },
      status: conversation.status === "resolved" ? "open" : conversation.status,
    },
  });

  // Realtime notify (no-op if Pusher not configured).
  if (pusher) {
    await pusher.trigger(workspaceChannel(workspaceId, "inbox"), "message", {
      conversationId: conversation.id,
      message: { id: message.id, body, direction: "in", createdAt: message.createdAt },
    });
  }

  // Keyword auto-reply (best-effort, within 24h window).
  if (msg.type === "text" && body) {
    await maybeAutoReply(workspaceId, wabaId, conversation.id, phoneE164, body);
  }
}

async function maybeAutoReply(
  workspaceId: string,
  wabaId: string,
  conversationId: string,
  to: string,
  inbound: string,
) {
  const replies = await prisma.whatsappAutoReply.findMany({
    where: { workspaceId, isActive: true },
  });
  const text = inbound.toLowerCase();
  const match = replies.find((r) => {
    const trig = r.trigger.toLowerCase();
    if (r.matchType === "exact") return text === trig;
    if (r.matchType === "starts_with") return text.startsWith(trig);
    return text.includes(trig);
  });
  if (!match) return;

  const waba = await prisma.whatsappBusinessAccount.findUnique({ where: { id: wabaId } });
  const phone = await prisma.whatsappPhoneNumber.findFirst({ where: { wabaId } });
  let status: MessageStatus = "queued";
  let providerMessageId: string | null = null;

  if (waba && phone) {
    const res = await sendTextMessage(phone.phoneNumberId, decrypt(waba.accessToken), to, match.reply);
    if (res.ok) {
      status = "sent";
      providerMessageId = res.data.messages?.[0]?.id ?? null;
    } else {
      status = "failed";
    }
  }

  await prisma.message.create({
    data: {
      conversationId,
      direction: "out",
      channel: "whatsapp",
      type: "text",
      body: match.reply,
      status,
      providerMessageId,
      sentBy: "automation",
      sentAt: new Date(),
    },
  });
}

async function handleStatus(status: NonNullable<MetaValue["statuses"]>[number]) {
  const mapped = STATUS_MAP[status.status];
  if (!mapped) return;

  // Update the outbound message.
  await prisma.message.updateMany({
    where: { providerMessageId: status.id },
    data: { status: mapped },
  });

  // Update campaign recipient + roll up campaign counters.
  const recipient = await prisma.campaignRecipient.findFirst({
    where: { providerMessageId: status.id },
  });
  if (recipient) {
    const now = new Date();
    const data: Record<string, unknown> = { status: mapped };
    if (mapped === "delivered") data.deliveredAt = now;
    if (mapped === "read") data.readAt = now;
    await prisma.campaignRecipient.update({ where: { id: recipient.id }, data });

    const field =
      mapped === "delivered" ? "deliveredCount" : mapped === "read" ? "readCount" : null;
    if (field) {
      await prisma.campaign.update({
        where: { id: recipient.campaignId },
        data: { [field]: { increment: 1 } },
      });
    }
  }
}
