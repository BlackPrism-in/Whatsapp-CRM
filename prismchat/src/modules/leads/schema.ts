import { z } from "zod";

// Pipeline stages map to the LeadStatus enum. Display labels are CRM-friendly.
export const LEAD_STAGES = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "converted", label: "Won" },
  { value: "lost", label: "Lost" },
] as const;

export type LeadStage = (typeof LEAD_STAGES)[number]["value"];

export const leadStageValues = LEAD_STAGES.map((s) => s.value) as [
  LeadStage,
  ...LeadStage[],
];

export const leadSchema = z
  .object({
    name: z.string().trim().max(200).optional().or(z.literal("")),
    phone: z.string().trim().max(20).optional().or(z.literal("")),
    email: z.string().trim().email("Enter a valid email").optional().or(z.literal("")),
    company: z.string().trim().max(200).optional().or(z.literal("")),
    source: z.string().trim().max(64).optional().or(z.literal("")),
    status: z.enum(leadStageValues),
    score: z.coerce.number().int().min(0).max(100).optional(),
  })
  .refine((d) => d.name || d.phone || d.email, {
    message: "A lead needs at least a name, phone, or email",
    path: ["name"],
  });

export type LeadInput = z.infer<typeof leadSchema>;
