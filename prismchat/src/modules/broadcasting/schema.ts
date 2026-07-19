import { z } from "zod";

// Audience selection: everyone, or filtered by segments/tags. Opt-in for the
// channel is always enforced at resolution time.
export const audienceSchema = z.object({
  mode: z.enum(["all", "segments", "tags"]).default("all"),
  segmentIds: z.array(z.string()).optional(),
  tagIds: z.array(z.string()).optional(),
});

export type AudienceConfig = z.infer<typeof audienceSchema>;

export const createCampaignSchema = z.object({
  name: z.string().trim().min(1, "Enter a campaign name").max(200),
  templateId: z.string().trim().min(1, "Choose a template"),
  audienceMode: z.enum(["all", "segments", "tags"]),
  segmentIds: z.array(z.string()).optional(),
  tagIds: z.array(z.string()).optional(),
  scheduledAt: z.string().optional(),
});

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
