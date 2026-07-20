import { prisma } from "@/lib/prisma";
import { LEAD_STAGES, type LeadStage } from "./schema";

export type LeadCard = {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  company: string | null;
  source: string | null;
  score: number;
  status: LeadStage;
  createdAt: Date;
};

/** All leads for a workspace, bucketed by pipeline stage for the Kanban board. */
export async function getPipeline(workspaceId: string) {
  const leads = await prisma.lead.findMany({
    where: { workspaceId },
    orderBy: [{ score: "desc" }, { createdAt: "desc" }],
  });

  const columns = LEAD_STAGES.map((stage) => ({
    ...stage,
    leads: leads.filter((l) => l.status === stage.value) as LeadCard[],
  }));

  return { columns, total: leads.length };
}

export async function getLead(workspaceId: string, id: string) {
  return prisma.lead.findFirst({ where: { id, workspaceId } });
}
