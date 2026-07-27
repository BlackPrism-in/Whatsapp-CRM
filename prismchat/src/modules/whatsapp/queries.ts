import { prisma } from "@/lib/prisma";

/** The workspace's primary connected WhatsApp Business Account (if any). */
export async function getWaba(workspaceId: string) {
  return prisma.whatsappBusinessAccount.findFirst({
    where: { workspaceId },
    // Keep this read limited to what the setup page renders. Besides reducing
    // the data returned (notably the encrypted access token), this lets the
    // page continue to load during a rolling deployment while an additive
    // WhatsApp migration is being applied.
    select: {
      id: true,
      wabaId: true,
      name: true,
      webhookVerifyToken: true,
      status: true,
      // Onboarding mode + token health (migration `waba_token_health`).
      // ⚠️ These columns must exist in the target database before this ships —
      // deploy migrations first, or this page 500s.
      onboardingMode: true,
      isOnBizApp: true,
      lastError: true,
      lastVerifiedAt: true,
      phoneNumbers: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          displayNumber: true,
          name: true,
          status: true,
          qualityRating: true,
        },
      },
    },
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
