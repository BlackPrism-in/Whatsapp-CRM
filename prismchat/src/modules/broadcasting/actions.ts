"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireWorkspace } from "@/lib/session";
import { getQueue, QUEUE_NAMES } from "@/lib/queue";
import { createCampaignSchema, audienceSchema, type AudienceConfig } from "./schema";
import { countAudience, selectAudienceIds } from "./audience";

export type CampaignState = { error?: string; ok?: boolean; id?: string } | undefined;

function readAudience(formData: FormData): AudienceConfig {
  return audienceSchema.parse({
    mode: formData.get("audienceMode") ?? "all",
    segmentIds: formData.getAll("segmentIds").map(String).filter(Boolean),
    tagIds: formData.getAll("tagIds").map(String).filter(Boolean),
  });
}

/** Live audience-size preview for the campaign builder. */
export async function previewAudience(formData: FormData): Promise<{ count: number }> {
  const { workspace } = await requireWorkspace();
  const audience = readAudience(formData);
  const count = await countAudience(workspace.id, audience);
  return { count };
}

export async function createCampaign(_prev: CampaignState, formData: FormData): Promise<CampaignState> {
  const { workspace } = await requireWorkspace();
  const parsed = createCampaignSchema.safeParse({
    name: formData.get("name"),
    templateId: formData.get("templateId"),
    audienceMode: formData.get("audienceMode") ?? "all",
    segmentIds: formData.getAll("segmentIds").map(String).filter(Boolean),
    tagIds: formData.getAll("tagIds").map(String).filter(Boolean),
    scheduledAt: formData.get("scheduledAt") ?? undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const template = await prisma.whatsappTemplate.findFirst({
    where: { id: parsed.data.templateId, workspaceId: workspace.id },
  });
  if (!template) return { error: "Template not found" };

  const audience: AudienceConfig = {
    mode: parsed.data.audienceMode,
    segmentIds: parsed.data.segmentIds,
    tagIds: parsed.data.tagIds,
  };
  const total = await countAudience(workspace.id, audience);

  const scheduledAt = parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : null;

  const campaign = await prisma.campaign.create({
    data: {
      workspaceId: workspace.id,
      name: parsed.data.name,
      channel: "whatsapp",
      status: scheduledAt ? "scheduled" : "draft",
      templateId: template.id,
      audienceJson: audience,
      scheduledAt,
      totalRecipients: total,
    },
  });

  revalidatePath("/app/broadcasts");
  return { ok: true, id: campaign.id };
}

/**
 * Launch a campaign: materialize recipients from the audience and enqueue a
 * send job per recipient. The worker (src/workers) performs the actual sends.
 */
export async function launchCampaign(id: string): Promise<CampaignState> {
  const { workspace } = await requireWorkspace();
  const campaign = await prisma.campaign.findFirst({
    where: { id, workspaceId: workspace.id },
  });
  if (!campaign) return { error: "Campaign not found" };
  if (campaign.status === "sending" || campaign.status === "completed") {
    return { error: "Campaign already launched" };
  }

  const audience = audienceSchema.parse(campaign.audienceJson ?? { mode: "all" });
  const contacts = await selectAudienceIds(workspace.id, audience);
  if (contacts.length === 0) return { error: "No opted-in contacts match this audience" };

  // Create recipient rows (idempotent via unique [campaignId, contactId]).
  await prisma.campaignRecipient.createMany({
    data: contacts.map((c) => ({ campaignId: campaign.id, contactId: c.id })),
    skipDuplicates: true,
  });

  await prisma.campaign.update({
    where: { id: campaign.id },
    data: { status: "sending", startedAt: new Date(), totalRecipients: contacts.length },
  });

  // Enqueue one job per recipient. BullMQ dedupes by jobId to survive retries.
  // Actual send pacing is enforced by the worker's rate limiter (see
  // src/workers/index.ts) — Meta throttles bulk sends and will restrict a
  // number that bursts. Attempts/backoff cover transient rate limits.
  const queue = getQueue(QUEUE_NAMES.broadcast);
  const attempts = Number(process.env.BROADCAST_ATTEMPTS ?? 5);
  await queue.addBulk(
    contacts.map((c) => ({
      name: "send",
      data: { campaignId: campaign.id, contactId: c.id },
      opts: {
        jobId: `bcast:${campaign.id}:${c.id}`,
        attempts,
        // 10s, 20s, 40s, 80s — well clear of Meta's per-second windows.
        backoff: { type: "exponential", delay: 10_000 },
        removeOnComplete: 1000,
        removeOnFail: 5000,
      },
    })),
  );

  revalidatePath("/app/broadcasts");
  revalidatePath(`/app/broadcasts/${campaign.id}`);
  return { ok: true, id: campaign.id };
}

export async function pauseCampaign(id: string): Promise<void> {
  const { workspace } = await requireWorkspace();
  await prisma.campaign.updateMany({
    where: { id, workspaceId: workspace.id, status: "sending" },
    data: { status: "paused" },
  });
  revalidatePath(`/app/broadcasts/${id}`);
}

export async function deleteCampaign(id: string): Promise<void> {
  const { workspace } = await requireWorkspace();
  await prisma.campaign.deleteMany({ where: { id, workspaceId: workspace.id } });
  revalidatePath("/app/broadcasts");
}
