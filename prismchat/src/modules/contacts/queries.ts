import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

const PAGE_SIZE = 25;

export type ContactListParams = {
  workspaceId: string;
  search?: string;
  tagId?: string;
  page?: number;
};

/** Paginated, tenant-scoped contact list with tag filtering + search. */
export async function listContacts({
  workspaceId,
  search,
  tagId,
  page = 1,
}: ContactListParams) {
  const where: Prisma.ContactWhereInput = {
    workspaceId,
    deletedAt: null,
  };

  if (search && search.trim()) {
    const q = search.trim();
    where.OR = [
      { firstName: { contains: q, mode: "insensitive" } },
      { lastName: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { phoneE164: { contains: q } },
    ];
  }

  if (tagId) {
    where.tags = { some: { tagId } };
  }

  const [items, total] = await Promise.all([
    prisma.contact.findMany({
      where,
      include: { tags: { include: { tag: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.contact.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    pageSize: PAGE_SIZE,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

export async function getContact(workspaceId: string, id: string) {
  return prisma.contact.findFirst({
    where: { id, workspaceId, deletedAt: null },
    include: { tags: { include: { tag: true } } },
  });
}

export async function listWorkspaceTags(workspaceId: string) {
  return prisma.contactTag.findMany({
    where: { workspaceId },
    orderBy: { name: "asc" },
  });
}
