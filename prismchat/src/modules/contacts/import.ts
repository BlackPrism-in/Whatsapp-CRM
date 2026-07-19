import Papa from "papaparse";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "./schema";

export type ImportResult = {
  error?: string;
  imported?: number;
  skipped?: number;
  duplicates?: number;
};

async function resolveTagIds(workspaceId: string, names: string[]) {
  const clean = [...new Set(names.map((n) => n.trim()).filter(Boolean))];
  const ids: string[] = [];
  for (const name of clean) {
    const tag = await prisma.contactTag.upsert({
      where: { workspaceId_name: { workspaceId, name } },
      create: { workspaceId, name },
      update: {},
    });
    ids.push(tag.id);
  }
  return ids;
}

/**
 * Pure import core: parse CSV text and insert deduped contacts for a workspace.
 * No auth/revalidation — callable from the server action and from tests.
 * Recognized headers (case-insensitive, spaces→underscores): first_name,
 * last_name, phone, email, country, tags. Tags split on `;` or `|`.
 */
export async function importContactRows(
  workspaceId: string,
  csvText: string,
): Promise<ImportResult> {
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase().replace(/[\s-]+/g, "_"),
  });

  if (parsed.errors.length && parsed.data.length === 0) {
    return { error: `Could not parse CSV: ${parsed.errors[0]?.message}` };
  }

  const pick = (row: Record<string, string>, keys: string[]) => {
    for (const k of keys) if (row[k]) return row[k].trim();
    return "";
  };

  let imported = 0;
  let skipped = 0;
  let duplicates = 0;

  const existing = await prisma.contact.findMany({
    where: { workspaceId, deletedAt: null, phoneE164: { not: null } },
    select: { phoneE164: true },
  });
  const seen = new Set(existing.map((c) => c.phoneE164));

  for (const row of parsed.data) {
    const phone = normalizePhone(pick(row, ["phone", "phone_e164", "mobile", "whatsapp"]));
    const email = pick(row, ["email", "e_mail"]) || null;
    if (!phone && !email) {
      skipped++;
      continue;
    }
    if (phone && seen.has(phone)) {
      duplicates++;
      continue;
    }

    const tagNames = pick(row, ["tags", "tag"])
      .split(/[;|]/)
      .map((t) => t.trim())
      .filter(Boolean);
    const tagIds = tagNames.length ? await resolveTagIds(workspaceId, tagNames) : [];

    try {
      await prisma.contact.create({
        data: {
          workspaceId,
          firstName: pick(row, ["first_name", "firstname", "name"]) || null,
          lastName: pick(row, ["last_name", "lastname", "surname"]) || null,
          phoneE164: phone,
          email,
          country: pick(row, ["country"]) || null,
          source: "import",
          optInWhatsapp: !!phone,
          tags: { create: tagIds.map((tagId) => ({ tagId })) },
        },
      });
      if (phone) seen.add(phone);
      imported++;
    } catch {
      skipped++;
    }
  }

  return { imported, skipped, duplicates };
}
