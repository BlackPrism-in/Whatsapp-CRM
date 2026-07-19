import { z } from "zod";

export const connectWabaSchema = z.object({
  name: z.string().trim().min(1, "Enter a label").max(128),
  wabaId: z.string().trim().regex(/^\d{5,}$/, "Enter a valid WhatsApp Business Account ID"),
  accessToken: z.string().trim().min(20, "Enter a valid access token"),
});

export type ConnectWabaInput = z.infer<typeof connectWabaSchema>;

export const TEMPLATE_CATEGORIES = ["MARKETING", "UTILITY", "AUTHENTICATION"] as const;

export const createTemplateSchema = z.object({
  name: z
    .string()
    .trim()
    .regex(/^[a-z0-9_]+$/, "Lowercase letters, numbers and underscores only")
    .max(512),
  language: z.string().trim().min(2).max(8),
  category: z.enum(TEMPLATE_CATEGORIES),
  body: z.string().trim().min(1, "Enter the message body").max(1024),
  header: z.string().trim().max(60).optional().or(z.literal("")),
  footer: z.string().trim().max(60).optional().or(z.literal("")),
});

export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;

export const autoReplySchema = z.object({
  trigger: z.string().trim().min(1, "Enter a trigger keyword").max(128),
  matchType: z.enum(["exact", "contains", "starts_with"]),
  reply: z.string().trim().min(1, "Enter a reply").max(2000),
  isActive: z.coerce.boolean().optional(),
});

/** Build Meta template `components` array from simple form fields. */
export function buildTemplateComponents(input: CreateTemplateInput): unknown[] {
  const components: unknown[] = [];
  if (input.header) {
    components.push({ type: "HEADER", format: "TEXT", text: input.header });
  }
  components.push({ type: "BODY", text: input.body });
  if (input.footer) {
    components.push({ type: "FOOTER", text: input.footer });
  }
  return components;
}
