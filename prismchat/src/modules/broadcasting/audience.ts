import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import type { AudienceConfig } from "./schema";

/**
 * Build the Prisma where-clause for a campaign audience. For WhatsApp we only
 * ever target contacts who have opted in and have a phone number.
 */
export function audienceWhere(
  workspaceId: string,
  audience: AudienceConfig,
): Prisma.ContactWhereInput {
  const where: Prisma.ContactWhereInput = {
    workspaceId,
    deletedAt: null,
    phoneE164: { not: null },
    optInWhatsapp: true,
  };

  if (audience.mode === "segments" && audience.segmentIds?.length) {
    where.segments = { some: { segmentId: { in: audience.segmentIds } } };
  } else if (audience.mode === "tags" && audience.tagIds?.length) {
    where.tags = { some: { tagId: { in: audience.tagIds } } };
  }

  return where;
}

export function countAudience(workspaceId: string, audience: AudienceConfig) {
  return prisma.contact.count({ where: audienceWhere(workspaceId, audience) });
}

export function selectAudienceIds(workspaceId: string, audience: AudienceConfig) {
  return prisma.contact.findMany({
    where: audienceWhere(workspaceId, audience),
    select: { id: true },
  });
}
