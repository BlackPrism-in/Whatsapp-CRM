import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import {
  subscribeAppToWaba,
  fetchPhoneNumbers,
  fetchPhoneNumberDetails,
  registerPhoneNumber,
} from "@/lib/whatsapp";
import { getQueue, QUEUE_NAMES } from "@/lib/queue";

/**
 * Phase 2 — auto-wire a freshly connected WABA so the client never has to open
 * Meta's dashboard: subscribe webhooks, pull phone numbers, register them
 * (except in coexistence), and kick off a template sync.
 *
 * Never throws. Returns warnings so the UI can report partial success — a
 * webhook hiccup shouldn't make a successful connection look like a failure.
 */

export type ProvisionResult = {
  phoneCount: number;
  warnings: string[];
  /** True when Meta confirms the number is also live on the Business app. */
  isOnBizApp: boolean;
};

/** Registration PIN. Deterministic per WABA so re-runs reuse the same one. */
function derivePin(wabaId: string): string {
  const secret = process.env.ENCRYPTION_KEY ?? "prismchat";
  const digest = crypto.createHmac("sha256", secret).update(wabaId).digest("hex");
  // Meta requires a 6-digit numeric PIN.
  return (parseInt(digest.slice(0, 8), 16) % 1_000_000).toString().padStart(6, "0");
}

export async function provisionWaba(wabaId: string): Promise<ProvisionResult> {
  const warnings: string[] = [];
  let phoneCount = 0;
  let isOnBizApp = false;

  const waba = await prisma.whatsappBusinessAccount.findUnique({ where: { wabaId } });
  if (!waba) return { phoneCount: 0, warnings: ["WhatsApp account not found."], isOnBizApp };

  let token: string;
  try {
    token = decrypt(waba.accessToken);
  } catch {
    return {
      phoneCount: 0,
      warnings: ["Stored credentials could not be read. Reconnect the account."],
      isOnBizApp,
    };
  }

  const isCoexistence = waba.onboardingMode === "coexistence";

  // 1. Subscribe our app to this WABA's webhook events.
  const sub = await subscribeAppToWaba(wabaId, token);
  if (!sub.ok) {
    warnings.push(
      `Could not subscribe to WhatsApp webhooks automatically (${sub.error}). Inbound messages may not arrive until this is retried.`,
    );
  }

  // 2. Pull the phone numbers attached to the WABA.
  const numbers = await fetchPhoneNumbers(wabaId, token);
  if (!numbers.ok) {
    warnings.push(`Could not fetch phone numbers: ${numbers.error}`);
    return { phoneCount, warnings, isOnBizApp };
  }

  for (const p of numbers.data.data) {
    // 3. Detail call tells us whether this is a coexistence number.
    const details = await fetchPhoneNumberDetails(p.id, token);
    const onBizApp = details.ok ? details.data.is_on_biz_app === true : false;
    const platformType = details.ok ? details.data.platform_type ?? null : null;
    if (onBizApp) isOnBizApp = true;

    await prisma.whatsappPhoneNumber.upsert({
      where: { phoneNumberId: p.id },
      create: {
        wabaId: waba.id,
        phoneNumberId: p.id,
        displayNumber: p.display_phone_number,
        name: p.verified_name ?? null,
        status: p.status ?? null,
        qualityRating: p.quality_rating ?? null,
      },
      update: {
        displayNumber: p.display_phone_number,
        name: p.verified_name ?? null,
        status: p.status ?? null,
        qualityRating: p.quality_rating ?? null,
      },
    });
    phoneCount++;

    // 4. Register for Cloud API messaging.
    //    ⚠️ Skipped for coexistence — those numbers are already registered and
    //    re-registering would sever the WhatsApp Business app link.
    if (isCoexistence || onBizApp) {
      continue;
    }
    const reg = await registerPhoneNumber(p.id, token, derivePin(wabaId));
    if (!reg.ok && reg.code !== 133005 /* already registered */) {
      warnings.push(`Could not register ${p.display_phone_number}: ${reg.error}`);
    }

    void platformType;
  }

  // 5. Record what Meta told us about the platform.
  const firstDetails = numbers.data.data[0]
    ? await fetchPhoneNumberDetails(numbers.data.data[0].id, token)
    : null;
  await prisma.whatsappBusinessAccount.update({
    where: { id: waba.id },
    data: {
      isOnBizApp: isOnBizApp || waba.isOnBizApp,
      platformType:
        firstDetails?.ok ? firstDetails.data.platform_type ?? null : waba.platformType,
    },
  });

  if (phoneCount === 0) {
    warnings.push(
      "No phone numbers are attached to this WhatsApp Business Account yet. Add one in Meta, then use Sync phone numbers.",
    );
  }

  // 6. Templates — queued so a slow Meta call never blocks onboarding.
  if (phoneCount > 0) {
    try {
      await getQueue(QUEUE_NAMES.whatsappSync).add(
        "sync-templates",
        { wabaId: waba.id },
        { attempts: 3, backoff: { type: "exponential", delay: 5000 }, removeOnComplete: 100 },
      );
    } catch {
      warnings.push("Templates will need a manual sync (background queue unavailable).");
    }
  }

  return { phoneCount, warnings, isOnBizApp };
}
