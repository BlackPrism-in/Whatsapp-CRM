import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import { sendTemplateMessage } from "@/lib/whatsapp";
import {
  recordGraphOutcome,
  markTokenInvalid,
  isAuthError,
} from "@/modules/whatsapp/token-health";

/**
 * Thrown for retryable send failures (rate limits, Meta outages, network).
 * BullMQ catches this and retries the job with exponential backoff; the
 * recipient row is left `pending` so nothing is lost.
 */
export class TransientSendError extends Error {
  readonly code?: number;
  constructor(message: string, code?: number) {
    super(message);
    this.name = "TransientSendError";
    this.code = code;
  }
}

/**
 * Send one campaign message to one contact and record the result. Called by the
 * broadcast worker (one job per recipient). Idempotent-ish: skips recipients
 * already past `pending`.
 *
 * Returns a short status string for logging.
 */
export async function sendCampaignMessage(
  campaignId: string,
  contactId: string,
): Promise<string> {
  const recipient = await prisma.campaignRecipient.findUnique({
    where: { campaignId_contactId: { campaignId, contactId } },
  });
  if (!recipient) return "no-recipient";
  if (recipient.status !== "pending") return `already:${recipient.status}`;

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: { template: true },
  });
  if (!campaign) return "no-campaign";
  if (campaign.status === "paused") return "paused";

  const contact = await prisma.contact.findUnique({ where: { id: contactId } });
  if (!contact?.phoneE164) {
    return await markFailed(campaignId, recipient.id, "Contact has no phone number");
  }

  const waba = await prisma.whatsappBusinessAccount.findFirst({
    where: { workspaceId: campaign.workspaceId },
    include: { phoneNumbers: { orderBy: { createdAt: "asc" }, take: 1 } },
  });
  const phone = waba?.phoneNumbers[0];
  if (!waba || !phone) {
    return await markFailed(campaignId, recipient.id, "No WhatsApp sender configured");
  }
  if (!campaign.template) {
    return await markFailed(campaignId, recipient.id, "Campaign has no template");
  }

  let token: string;
  try {
    token = decrypt(waba.accessToken);
  } catch {
    // Credentials unreadable (e.g. ENCRYPTION_KEY rotated). Flag the account so
    // the UI prompts a reconnect rather than failing every recipient in silence.
    await markTokenInvalid(waba.id, "Stored credentials could not be decrypted.");
    return await markFailed(
      campaignId,
      recipient.id,
      "WhatsApp credentials could not be read — reconnect the account.",
    );
  }

  const res = await sendTemplateMessage(phone.phoneNumberId, token, contact.phoneE164, {
    name: campaign.template.name,
    language: campaign.template.language,
  });

  // Keep the account's health status in step with what Meta just told us.
  await recordGraphOutcome(waba.id, res);

  if (!res.ok) {
    // An invalid/revoked token will fail identically for every remaining
    // recipient. Pause the campaign so the client can reconnect and resume,
    // instead of burning through thousands of guaranteed failures.
    if (isAuthError(res)) {
      await prisma.campaign.updateMany({
        where: { id: campaignId, status: "sending" },
        data: { status: "paused" },
      });
      return await markFailed(
        campaignId,
        recipient.id,
        `WhatsApp authorisation failed — campaign paused. ${res.error}`,
      );
    }
    // Transient (rate limit / Meta 5xx / network): throw so BullMQ retries with
    // backoff. The recipient stays `pending` so it is never silently dropped.
    if (res.transient) {
      throw new TransientSendError(res.error, res.code);
    }
    // Permanent (bad number, template rejected): stop here.
    return await markFailed(campaignId, recipient.id, res.error);
  }

  const providerMessageId = res.data.messages?.[0]?.id ?? null;
  await prisma.$transaction([
    prisma.campaignRecipient.update({
      where: { id: recipient.id },
      data: { status: "sent", providerMessageId, sentAt: new Date() },
    }),
    prisma.campaign.update({
      where: { id: campaignId },
      data: { sentCount: { increment: 1 } },
    }),
  ]);
  return "sent";
}

/**
 * Mark a recipient permanently failed. Called for non-retryable errors, and by
 * the worker when a job exhausts all its retry attempts.
 */
export async function markRecipientFailedByContact(
  campaignId: string,
  contactId: string,
  error: string,
) {
  const recipient = await prisma.campaignRecipient.findUnique({
    where: { campaignId_contactId: { campaignId, contactId } },
  });
  // Only consume a recipient that is still pending — avoids double-counting.
  if (!recipient || recipient.status !== "pending") return;
  await markFailed(campaignId, recipient.id, error);
}

async function markFailed(campaignId: string, recipientId: string, error: string) {
  await prisma.$transaction([
    prisma.campaignRecipient.update({
      where: { id: recipientId },
      data: { status: "failed", errorJson: { error } },
    }),
    prisma.campaign.update({
      where: { id: campaignId },
      data: { failedCount: { increment: 1 } },
    }),
  ]);
  return `failed:${error}`;
}

/** After a campaign's jobs drain, flip it to completed if nothing is pending. */
export async function finalizeCampaignIfDone(campaignId: string) {
  const pending = await prisma.campaignRecipient.count({
    where: { campaignId, status: "pending" },
  });
  if (pending === 0) {
    await prisma.campaign.updateMany({
      where: { id: campaignId, status: "sending" },
      data: { status: "completed", completedAt: new Date() },
    });
  }
}
