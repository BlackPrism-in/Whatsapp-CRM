import { prisma } from "@/lib/prisma";

/** Aggregate workspace metrics for the Reports page. */
export async function getReports(workspaceId: string) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000);

  const [
    totalContacts,
    newContacts30d,
    optedIn,
    campaigns,
    conversations,
    openConversations,
    leadsByStage,
    topTags,
    products,
  ] = await Promise.all([
    prisma.contact.count({ where: { workspaceId, deletedAt: null } }),
    prisma.contact.count({
      where: { workspaceId, deletedAt: null, createdAt: { gte: thirtyDaysAgo } },
    }),
    prisma.contact.count({
      where: { workspaceId, deletedAt: null, optInWhatsapp: true, phoneE164: { not: null } },
    }),
    prisma.campaign.findMany({
      where: { workspaceId },
      select: {
        id: true,
        name: true,
        status: true,
        totalRecipients: true,
        sentCount: true,
        deliveredCount: true,
        readCount: true,
        repliedCount: true,
        failedCount: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.conversation.count({ where: { workspaceId } }),
    prisma.conversation.count({ where: { workspaceId, status: "open" } }),
    prisma.lead.groupBy({
      by: ["status"],
      where: { workspaceId },
      _count: { _all: true },
    }),
    prisma.contactTag.findMany({
      where: { workspaceId },
      select: { name: true, color: true, _count: { select: { contacts: true } } },
    }),
    prisma.product.count({ where: { workspaceId } }),
  ]);

  const totals = campaigns.reduce(
    (acc, c) => ({
      recipients: acc.recipients + c.totalRecipients,
      sent: acc.sent + c.sentCount,
      delivered: acc.delivered + c.deliveredCount,
      read: acc.read + c.readCount,
      replied: acc.replied + c.repliedCount,
      failed: acc.failed + c.failedCount,
    }),
    { recipients: 0, sent: 0, delivered: 0, read: 0, replied: 0, failed: 0 },
  );

  const deliveryRate = totals.sent ? (totals.delivered / totals.sent) * 100 : 0;
  const readRate = totals.delivered ? (totals.read / totals.delivered) * 100 : 0;
  const replyRate = totals.delivered ? (totals.replied / totals.delivered) * 100 : 0;

  return {
    contacts: { total: totalContacts, new30d: newContacts30d, optedIn },
    conversations: { total: conversations, open: openConversations },
    campaigns,
    totals,
    rates: { deliveryRate, readRate, replyRate },
    leadsByStage: leadsByStage.map((l) => ({ stage: l.status, count: l._count._all })),
    topTags: topTags
      .map((t) => ({ name: t.name, color: t.color, count: t._count.contacts }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
    products,
  };
}
