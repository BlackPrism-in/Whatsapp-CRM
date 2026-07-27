import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/modules/contacts/schema";
import type { MessageDirection, MessageStatus } from "@/generated/prisma/enums";

/**
 * Coexistence data sync (Phase 4).
 *
 * When a client onboards from the WhatsApp Business app, Meta pushes their
 * existing data to our webhook via three extra fields:
 *
 *   - `smb_app_state_sync`   → their contacts
 *   - `history`              → up to 180 days of past conversations
 *   - `smb_message_echoes`   → messages they send FROM their phone, ongoing
 *
 * ⚠️ Contact/history sync is **one-shot**: Meta will not resend it. The webhook
 * route persists every raw payload to `InboundWebhookEvent` *before* calling
 * into here, so a crash mid-import can be replayed rather than losing the
 * client's history permanently.
 */

// ---------------------------------------------------------------------------
// Payload shapes (only the parts we consume)
// ---------------------------------------------------------------------------

export type SmbAppStateSyncValue = {
  metadata?: { phone_number_id?: string };
  state_sync?: {
    type?: string; // "contact"
    contact?: {
      full_name?: string;
      first_name?: string;
      phone_number?: string;
    };
    action?: string; // "add" | "remove"
  }[];
};

export type HistoryValue = {
  metadata?: { phone_number_id?: string };
  history?: {
    metadata?: { phase?: string; chunk_order?: number; progress?: number };
    threads?: {
      id?: string; // the customer's wa_id
      messages?: HistoryMessage[];
    }[];
  }[];
};

type HistoryMessage = {
  id: string;
  from?: string;
  to?: string;
  timestamp?: string;
  type?: string;
  text?: { body?: string };
  history_context?: { status?: string; from_me?: boolean };
};

export type MessageEchoValue = {
  metadata?: { phone_number_id?: string };
  message_echoes?: {
    id: string;
    to?: string;
    from?: string;
    timestamp?: string;
    type?: string;
    text?: { body?: string };
  }[];
};

export type SyncOutcome = {
  contactsCreated: number;
  contactsUpdated: number;
  conversations: number;
  messages: number;
  skipped: number;
};

const EMPTY: SyncOutcome = {
  contactsCreated: 0,
  contactsUpdated: 0,
  conversations: 0,
  messages: 0,
  skipped: 0,
};

/**
 * Resolve which workspace a payload belongs to, via its phone number id.
 *
 * Also resolves the workspace's WhatsApp `ChannelAccount`, which conversations
 * reference by foreign key. This is looked up rather than assumed to equal the
 * WABA row id — they coincide when created by `connectViaEmbeddedSignup`, but
 * relying on that would break if the channel account is ever absent.
 */
async function resolveContext(phoneNumberId?: string) {
  if (!phoneNumberId) return null;
  const phone = await prisma.whatsappPhoneNumber.findUnique({
    where: { phoneNumberId },
    include: { waba: true },
  });
  if (!phone) return null;

  const workspaceId = phone.waba.workspaceId;
  const channelAccount = await prisma.channelAccount.findFirst({
    where: { workspaceId, channel: "whatsapp" },
    orderBy: { createdAt: "asc" },
  });

  return {
    workspaceId,
    wabaRowId: phone.waba.id,
    // Null is tolerated — conversations can exist without a channel account.
    channelAccountId: channelAccount?.id ?? null,
    phoneNumberId,
  };
}

/** Find-or-create a contact by phone within a workspace. */
async function upsertContactByPhone(
  workspaceId: string,
  rawPhone: string,
  name?: string | null,
): Promise<{ id: string; created: boolean } | null> {
  const phoneE164 = normalizePhone(rawPhone.startsWith("+") ? rawPhone : `+${rawPhone}`);
  if (!phoneE164) return null;

  const existing = await prisma.contact.findFirst({
    where: { workspaceId, phoneE164, deletedAt: null },
  });

  if (existing) {
    // Only fill in a name we didn't already have — never overwrite user edits.
    if (name && !existing.firstName) {
      await prisma.contact.update({
        where: { id: existing.id },
        data: { firstName: name },
      });
    }
    return { id: existing.id, created: false };
  }

  const created = await prisma.contact.create({
    data: {
      workspaceId,
      phoneE164,
      firstName: name || null,
      source: "whatsapp_coexistence",
      optInWhatsapp: true,
    },
  });
  return { id: created.id, created: true };
}

/** Find-or-create the conversation for a contact. */
async function ensureConversation(
  workspaceId: string,
  contactId: string,
  channelAccountId: string | null,
) {
  const existing = await prisma.conversation.findFirst({
    where: { workspaceId, contactId },
    orderBy: { createdAt: "desc" },
  });
  if (existing) return { id: existing.id, created: false };

  const created = await prisma.conversation.create({
    data: { workspaceId, contactId, channelAccountId, status: "open" },
  });
  return { id: created.id, created: true };
}

// ---------------------------------------------------------------------------
// 1. Contacts — `smb_app_state_sync`
// ---------------------------------------------------------------------------

export async function handleAppStateSync(
  value: SmbAppStateSyncValue,
): Promise<SyncOutcome> {
  const ctx = await resolveContext(value.metadata?.phone_number_id);
  if (!ctx) return { ...EMPTY, skipped: value.state_sync?.length ?? 0 };

  const out: SyncOutcome = { ...EMPTY };

  for (const entry of value.state_sync ?? []) {
    // Only contact adds are actionable; deletions on the phone should not
    // silently delete CRM records the business may rely on.
    if (entry.type !== "contact" || entry.action === "remove") {
      out.skipped++;
      continue;
    }
    const phone = entry.contact?.phone_number;
    if (!phone) {
      out.skipped++;
      continue;
    }
    const name = entry.contact?.full_name || entry.contact?.first_name || null;
    const res = await upsertContactByPhone(ctx.workspaceId, phone, name);
    if (!res) {
      out.skipped++;
      continue;
    }
    if (res.created) out.contactsCreated++;
    else out.contactsUpdated++;
  }

  await prisma.whatsappBusinessAccount.update({
    where: { id: ctx.wabaRowId },
    data: { contactsSyncedAt: new Date() },
  });

  return out;
}

// ---------------------------------------------------------------------------
// 2. History — `history`
// ---------------------------------------------------------------------------

export async function handleHistory(value: HistoryValue): Promise<SyncOutcome> {
  const ctx = await resolveContext(value.metadata?.phone_number_id);
  if (!ctx) return { ...EMPTY };

  const out: SyncOutcome = { ...EMPTY };

  for (const chunk of value.history ?? []) {
    for (const thread of chunk.threads ?? []) {
      const waId = thread.id;
      if (!waId) continue;

      const contact = await upsertContactByPhone(ctx.workspaceId, waId, null);
      if (!contact) continue;
      if (contact.created) out.contactsCreated++;

      const convo = await ensureConversation(
        ctx.workspaceId,
        contact.id,
        ctx.channelAccountId,
      );
      if (convo.created) out.conversations++;

      for (const msg of thread.messages ?? []) {
        const imported = await importHistoricMessage(convo.id, msg);
        if (imported) out.messages++;
        else out.skipped++;
      }

      // Keep the conversation ordered correctly in the inbox.
      const latest = await prisma.message.findFirst({
        where: { conversationId: convo.id },
        orderBy: { sentAt: "desc" },
        select: { sentAt: true },
      });
      if (latest?.sentAt) {
        await prisma.conversation.update({
          where: { id: convo.id },
          data: { lastMessageAt: latest.sentAt },
        });
      }
    }
  }

  await prisma.whatsappBusinessAccount.update({
    where: { id: ctx.wabaRowId },
    data: { historySyncedAt: new Date() },
  });

  return out;
}

/** Insert one historic message, skipping duplicates (safe to replay). */
async function importHistoricMessage(
  conversationId: string,
  msg: HistoryMessage,
): Promise<boolean> {
  const existing = await prisma.message.findFirst({
    where: { providerMessageId: msg.id },
    select: { id: true },
  });
  if (existing) return false;

  const fromMe = msg.history_context?.from_me === true;
  const direction: MessageDirection = fromMe ? "out" : "in";
  const status: MessageStatus = fromMe ? "sent" : "delivered";

  await prisma.message.create({
    data: {
      conversationId,
      direction,
      channel: "whatsapp",
      type: msg.type === "text" ? "text" : "document",
      body: msg.type === "text" ? msg.text?.body ?? "" : `[${msg.type ?? "media"}]`,
      status,
      providerMessageId: msg.id,
      sentBy: "human",
      sentAt: toDate(msg.timestamp),
    },
  });
  return true;
}

// ---------------------------------------------------------------------------
// 3. Phone-sent messages — `smb_message_echoes`
// ---------------------------------------------------------------------------

/**
 * Messages the business sends from the WhatsApp Business app on their phone.
 * Mirroring these keeps PrismChat's inbox truthful — otherwise staff would see
 * a customer's question with no sign it was already answered from the phone.
 */
export async function handleMessageEchoes(
  value: MessageEchoValue,
): Promise<SyncOutcome> {
  const ctx = await resolveContext(value.metadata?.phone_number_id);
  if (!ctx) return { ...EMPTY };

  const out: SyncOutcome = { ...EMPTY };

  for (const echo of value.message_echoes ?? []) {
    const counterparty = echo.to;
    if (!counterparty) {
      out.skipped++;
      continue;
    }

    const contact = await upsertContactByPhone(ctx.workspaceId, counterparty, null);
    if (!contact) {
      out.skipped++;
      continue;
    }
    if (contact.created) out.contactsCreated++;

    const convo = await ensureConversation(
      ctx.workspaceId,
      contact.id,
      ctx.channelAccountId,
    );
    if (convo.created) out.conversations++;

    const duplicate = await prisma.message.findFirst({
      where: { providerMessageId: echo.id },
      select: { id: true },
    });
    if (duplicate) {
      out.skipped++;
      continue;
    }

    const sentAt = toDate(echo.timestamp);
    await prisma.message.create({
      data: {
        conversationId: convo.id,
        direction: "out",
        channel: "whatsapp",
        type: echo.type === "text" ? "text" : "document",
        body:
          echo.type === "text" ? echo.text?.body ?? "" : `[${echo.type ?? "media"}]`,
        status: "sent",
        providerMessageId: echo.id,
        sentBy: "human",
        sentAt,
      },
    });
    await prisma.conversation.update({
      where: { id: convo.id },
      data: { lastMessageAt: sentAt },
    });
    out.messages++;
  }

  return out;
}

/** Meta sends unix seconds as a string. */
function toDate(timestamp?: string): Date {
  const secs = Number(timestamp);
  return Number.isFinite(secs) && secs > 0 ? new Date(secs * 1000) : new Date();
}
