import { z } from "zod";

// E.164-ish: optional leading +, 7–15 digits. Empty allowed (email-only contacts).
const phoneRegex = /^\+?[1-9]\d{6,14}$/;

export const contactSchema = z.object({
  firstName: z.string().trim().max(128).optional().or(z.literal("")),
  lastName: z.string().trim().max(128).optional().or(z.literal("")),
  phoneE164: z
    .string()
    .trim()
    .refine((v) => !v || phoneRegex.test(v.replace(/[\s-]/g, "")), {
      message: "Enter a valid phone number in international format",
    })
    .optional()
    .or(z.literal("")),
  email: z.string().trim().email("Enter a valid email").optional().or(z.literal("")),
  country: z.string().trim().max(4).optional().or(z.literal("")),
  language: z.string().trim().max(8).optional().or(z.literal("")),
  source: z.string().trim().max(64).optional().or(z.literal("")),
  optInWhatsapp: z.coerce.boolean().optional(),
  optInSms: z.coerce.boolean().optional(),
  optInEmail: z.coerce.boolean().optional(),
  tags: z.array(z.string()).optional(),
})
  .refine((d) => (d.phoneE164 && d.phoneE164 !== "") || (d.email && d.email !== ""), {
    message: "A contact needs at least a phone number or an email",
    path: ["phoneE164"],
  });

export type ContactInput = z.infer<typeof contactSchema>;

/** Normalize a raw phone string to E.164-ish (strip spaces/dashes). */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[\s()-]/g, "");
  return cleaned || null;
}
