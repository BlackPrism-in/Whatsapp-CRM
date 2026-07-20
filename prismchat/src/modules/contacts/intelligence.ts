import { prisma } from "@/lib/prisma";

export type ContactIntelligence = {
  messagesIn: number;
  messagesOut: number;
  campaignsReceived: number;
  campaignsRead: number;
  campaignsReplied: number;
  lastInboundAt: Date | null;
  firstSeenAt: Date;
  orderCount: number;
  lifetimeValue: number;
  avgOrderValue: number;
  engagementScore: number;
  engagementLabel: string;
};

/**
 * Derive customer intelligence from existing activity. Engagement score (0–100)
 * blends inbound volume, campaign read/reply behaviour, and recency — so a
 * chatty, recently-active customer scores high and a dormant one decays.
 */
export async function getContactIntelligence(
  workspaceId: string,
  contactId: string,
): Promise<ContactIntelligence> {
  const contact = await prisma.contact.findFirstOrThrow({
    where: { id: contactId, workspaceId },
    select: { createdAt: true },
  });

  const conversations = await prisma.conversation.findMany({
    where: { workspaceId, contactId },
    select: { id: true, lastInboundAt: true },
  });
  const conversationIds = conversations.map((c) => c.id);

  const [messagesIn, messagesOut, recipients, orders] = await Promise.all([
    conversationIds.length
      ? prisma.message.count({ where: { conversationId: { in: conversationIds }, direction: "in" } })
      : 0,
    conversationIds.length
      ? prisma.message.count({ where: { conversationId: { in: conversationIds }, direction: "out" } })
      : 0,
    prisma.campaignRecipient.findMany({
      where: { contactId },
      select: { status: true },
    }),
    prisma.ecommerceOrder.findMany({
      where: { contactId },
      select: { total: true },
    }),
  ]);

  const campaignsReceived = recipients.length;
  const campaignsRead = recipients.filter((r) => r.status === "read").length;
  const campaignsReplied = recipients.filter((r) => r.status === "replied").length;

  const lifetimeValue = orders.reduce((sum, o) => sum + Number(o.total), 0);
  const orderCount = orders.length;
  const avgOrderValue = orderCount ? lifetimeValue / orderCount : 0;

  const lastInboundAt = conversations
    .map((c) => c.lastInboundAt)
    .filter((d): d is Date => !!d)
    .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;

  // Score: engagement volume (max 50) + campaign responsiveness (max 30) + recency (max 20)
  const volumeScore = Math.min(50, messagesIn * 10);
  const responseScore = campaignsReceived
    ? Math.round(((campaignsRead + campaignsReplied * 2) / (campaignsReceived * 2)) * 30)
    : 0;
  let recencyScore = 0;
  if (lastInboundAt) {
    const days = (Date.now() - lastInboundAt.getTime()) / 86_400_000;
    recencyScore = days <= 7 ? 20 : days <= 30 ? 12 : days <= 90 ? 5 : 0;
  }
  const engagementScore = Math.min(100, volumeScore + responseScore + recencyScore);

  const engagementLabel =
    engagementScore >= 70 ? "Highly engaged"
    : engagementScore >= 40 ? "Engaged"
    : engagementScore >= 15 ? "Low engagement"
    : "Dormant";

  return {
    messagesIn,
    messagesOut,
    campaignsReceived,
    campaignsRead,
    campaignsReplied,
    lastInboundAt,
    firstSeenAt: contact.createdAt,
    orderCount,
    lifetimeValue,
    avgOrderValue,
    engagementScore,
    engagementLabel,
  };
}
