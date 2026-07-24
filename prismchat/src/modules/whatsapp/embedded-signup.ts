import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/crypto";
import {
  exchangeCodeForToken,
  exchangeForLongLivedToken,
  verifyWaba,
} from "@/lib/whatsapp";

/**
 * Embedded Signup connection core.
 *
 * Pure of auth/session concerns so it can be unit-tested and reused. The server
 * action wraps it with `requireRole("admin")`.
 */

/** Meta's session event when the client onboarded from the WhatsApp Business app. */
export const COEXISTENCE_EVENT = "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING";

export type OnboardingMode = "standard" | "coexistence";

export type ConnectResult =
  | {
      ok: true;
      wabaId: string;
      name: string;
      mode: OnboardingMode;
      /** Non-fatal problems worth surfacing to the user. */
      warnings: string[];
    }
  | { ok: false; error: string; status?: number };

export type ConnectInput = {
  workspaceId: string;
  code: string;
  wabaId: string;
  phoneNumberId?: string | null;
  /** Raw `event` from Meta's session payload — decides standard vs coexistence. */
  event?: string | null;
};

export function resolveOnboardingMode(event?: string | null): OnboardingMode {
  return event === COEXISTENCE_EVENT ? "coexistence" : "standard";
}

/**
 * Exchange the Embedded Signup `code` for a long-lived token and persist the
 * client's WhatsApp Business Account against their workspace.
 *
 * Does NOT subscribe webhooks or sync numbers — that's Phase 2.
 */
export async function connectViaEmbeddedSignup(
  input: ConnectInput,
): Promise<ConnectResult> {
  const { workspaceId, code, wabaId, phoneNumberId } = input;
  const warnings: string[] = [];
  const mode = resolveOnboardingMode(input.event);

  // 0. Ownership guard FIRST — a cheap DB check. The Embedded Signup `code` is
  //    single-use, so we must not spend it on a WABA we're going to reject.
  const existing = await prisma.whatsappBusinessAccount.findUnique({
    where: { wabaId },
  });
  if (existing && existing.workspaceId !== workspaceId) {
    return {
      ok: false,
      error: "This WhatsApp Business Account is already connected to another workspace.",
      status: 409,
    };
  }

  // 1. code -> short-lived token
  const shortRes = await exchangeCodeForToken(code);
  if (!shortRes.ok) {
    return { ok: false, error: `Could not exchange the signup code: ${shortRes.error}` };
  }

  // 2. short -> long-lived token (fall back to the short one if it fails)
  const longRes = await exchangeForLongLivedToken(shortRes.data.access_token);
  const accessToken = longRes.ok
    ? longRes.data.access_token
    : shortRes.data.access_token;
  if (!longRes.ok) {
    warnings.push(
      "Could not upgrade to a long-lived token; the connection may expire sooner than expected.",
    );
  }

  // 3. Confirm the token actually grants access to this WABA
  const wabaRes = await verifyWaba(wabaId, accessToken);
  if (!wabaRes.ok) {
    return {
      ok: false,
      error: `Connected, but could not read the WhatsApp Business Account: ${wabaRes.error}`,
      status: wabaRes.status,
    };
  }

  // 5. Persist. Reuse the existing verify token so an already-configured Meta
  //    webhook keeps working across reconnects.
  const verifyToken = existing?.webhookVerifyToken ?? crypto.randomBytes(24).toString("hex");
  const verifyTokenHash = crypto.createHash("sha256").update(verifyToken).digest("hex");
  const name = wabaRes.data.name ?? wabaId;

  await prisma.whatsappBusinessAccount.upsert({
    where: { wabaId },
    create: {
      workspaceId,
      wabaId,
      name,
      accessToken: encrypt(accessToken),
      webhookVerifyToken: verifyToken,
      webhookVerifyTokenHash: verifyTokenHash,
      status: "connected",
      onboardingMode: mode,
      isOnBizApp: mode === "coexistence",
    },
    update: {
      name,
      accessToken: encrypt(accessToken),
      status: "connected",
      onboardingMode: mode,
      isOnBizApp: mode === "coexistence",
    },
  });

  // Keep the channel account in step for the inbox/broadcast layer.
  const waba = await prisma.whatsappBusinessAccount.findUniqueOrThrow({
    where: { wabaId },
  });
  await prisma.channelAccount.upsert({
    where: { id: waba.id },
    create: {
      id: waba.id,
      workspaceId,
      channel: "whatsapp",
      provider: "meta_cloud",
      displayName: name,
      businessAccountId: wabaId,
      phoneNumberId: phoneNumberId ?? null,
      status: "active",
    },
    update: {
      displayName: name,
      phoneNumberId: phoneNumberId ?? undefined,
      status: "active",
    },
  });

  return { ok: true, wabaId, name, mode, warnings };
}
