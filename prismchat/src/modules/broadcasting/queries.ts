import { prisma } from "@/lib/prisma";

export async function listCampaigns(workspaceId: string) {
  return prisma.campaign.findMany({
    where: { workspaceId },
    include: { template: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getCampaign(workspaceId: string, id: string) {
  return prisma.campaign.findFirst({
    where: { id, workspaceId },
    include: { template: true },
  });
}

/** Recipient status breakdown for a campaign's analytics view. */
export async function getCampaignStats(campaignId: string) {
  const grouped = await prisma.campaignRecipient.groupBy({
    by: ["status"],
    where: { campaignId },
    _count: { _all: true },
  });
  const stats: Record<string, number> = {
    pending: 0,
    sent: 0,
    delivered: 0,
    read: 0,
    replied: 0,
    failed: 0,
    skipped: 0,
  };
  for (const g of grouped) stats[g.status] = g._count._all;
  return stats;
}

export async function listApprovedTemplates(workspaceId: string) {
  return prisma.whatsappTemplate.findMany({
    where: { workspaceId },
    orderBy: { name: "asc" },
  });
}
