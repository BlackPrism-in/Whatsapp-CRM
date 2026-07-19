import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import { sendTemplateMessage } from "@/lib/whatsapp";

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

  const token = decrypt(waba.accessToken);
  const res = await sendTemplateMessage(phone.phoneNumberId, token, contact.phoneE164, {
    name: campaign.template.name,
    language: campaign.template.language,
  });

  if (!res.ok) {
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
