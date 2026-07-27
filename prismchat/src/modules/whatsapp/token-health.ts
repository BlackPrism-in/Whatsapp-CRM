import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import type { GraphResult } from "@/lib/whatsapp";

/**
 * WhatsApp credential health (Phase 5).
 *
 * Before this, a revoked or expired token failed silently at send time: the
 * broadcast marked recipients failed, the inbox reply showed a raw Meta error,
 * and nothing told the client their connection needed re-authorising. This
 * module classifies auth failures, records them on the WABA, and gives the UI
 * something actionable to show.
 */

/** WABA `status` values. */
export const WABA_STATUS = {
  connected: "connected",
  /** Meta rejected our credentials — the client must reconnect. */
  tokenInvalid: "token_invalid",
  /** Credentials are unreadable locally (e.g. ENCRYPTION_KEY changed). */
  credentialsUnreadable: "credentials_unreadable",
} as const;

/**
 * Meta error codes that mean "this token will never work again" — as opposed to
 * transient failures, which are handled by the broadcast retry logic.
 *
 *   190   — invalid/expired access token (also covers manual revocation)
 *   102   — session expired
 *   463   — expired token
 *   467   — invalid token
 *   200   — permission denied (client removed our app's asset access)
 *   10    — permission denied
 */
const AUTH_ERROR_CODES = new Set([190, 102, 463, 467, 200, 10]);

export function isAuthError(result: { code?: number; status?: number }): boolean {
  if (result.code !== undefined && AUTH_ERROR_CODES.has(result.code)) return true;
  // 401 always means auth; 403 usually means the asset was unshared.
  return result.status === 401 || result.status === 403;
}

/**
 * Record that Meta rejected our credentials for this WABA.
 * Safe to call repeatedly — it just refreshes the error detail.
 */
export async function markTokenInvalid(wabaRowId: string, error: string) {
  await prisma.whatsappBusinessAccount.update({
    where: { id: wabaRowId },
    data: {
      status: WABA_STATUS.tokenInvalid,
      lastError: error.slice(0, 500),
      lastErrorAt: new Date(),
    },
  });
}

/** Record a successful authenticated call — clears a previous failure. */
export async function markTokenHealthy(wabaRowId: string) {
  await prisma.whatsappBusinessAccount.update({
    where: { id: wabaRowId },
    data: {
      status: WABA_STATUS.connected,
      lastError: null,
      lastErrorAt: null,
      lastVerifiedAt: new Date(),
    },
  });
}

/**
 * Inspect a Graph result and update the WABA's health accordingly.
 * Returns the result unchanged so it can be used inline.
 */
export async function recordGraphOutcome<T>(
  wabaRowId: string,
  result: GraphResult<T>,
): Promise<GraphResult<T>> {
  try {
    if (result.ok) {
      await markTokenHealthy(wabaRowId);
    } else if (isAuthError(result)) {
      await markTokenInvalid(wabaRowId, result.error);
    }
    // Transient/non-auth failures deliberately leave status untouched — a Meta
    // outage shouldn't tell the client to reconnect.
  } catch {
    // Health tracking must never break the caller.
  }
  return result;
}

export type WabaCredentials =
  | { ok: true; wabaRowId: string; wabaId: string; token: string; isCoexistence: boolean }
  | { ok: false; reason: "not_connected" | "unreadable"; message: string };

/**
 * Read a workspace's WhatsApp credentials without throwing.
 *
 * `decrypt()` throws if ENCRYPTION_KEY changed or the ciphertext is corrupt.
 * Previously that propagated as a 500; now it degrades to a clear, actionable
 * error and flags the account so the UI can prompt a reconnect.
 */
export async function getCredentials(workspaceId: string): Promise<WabaCredentials> {
  const waba = await prisma.whatsappBusinessAccount.findFirst({
    where: { workspaceId },
    orderBy: { createdAt: "asc" },
  });
  if (!waba) {
    return {
      ok: false,
      reason: "not_connected",
      message: "No WhatsApp account is connected to this workspace.",
    };
  }

  try {
    const token = decrypt(waba.accessToken);
    return {
      ok: true,
      wabaRowId: waba.id,
      wabaId: waba.wabaId,
      token,
      isCoexistence: waba.onboardingMode === "coexistence" || waba.isOnBizApp,
    };
  } catch {
    await prisma.whatsappBusinessAccount
      .update({
        where: { id: waba.id },
        data: {
          status: WABA_STATUS.credentialsUnreadable,
          lastError: "Stored credentials could not be decrypted.",
          lastErrorAt: new Date(),
        },
      })
      .catch(() => {});
    return {
      ok: false,
      reason: "unreadable",
      message:
        "Stored WhatsApp credentials could not be read. Reconnect the account to continue.",
    };
  }
}

export type HealthCheck =
  | { ok: true; name: string; checkedAt: Date }
  | { ok: false; message: string; needsReconnect: boolean };

/**
 * Proactively verify a workspace's credentials against Meta.
 *
 * Without this, a revoked token is only discovered when a send fails — i.e.
 * partway through a broadcast. This lets the UI (and, later, a scheduled job)
 * confirm the connection is live *before* it matters, and clear a stale error
 * once the client has reconnected.
 */
export async function verifyWabaHealth(workspaceId: string): Promise<HealthCheck> {
  const creds = await getCredentials(workspaceId);
  if (!creds.ok) {
    return {
      ok: false,
      message: creds.message,
      needsReconnect: creds.reason === "unreadable",
    };
  }

  // Lazy import keeps this module free of a cycle with lib/whatsapp.
  const { verifyWaba } = await import("@/lib/whatsapp");
  const res = await verifyWaba(creds.wabaId, creds.token);
  await recordGraphOutcome(creds.wabaRowId, res);

  if (!res.ok) {
    return {
      ok: false,
      message: isAuthError(res)
        ? "Meta rejected the stored credentials — reconnect to continue."
        : `Could not reach Meta: ${res.error}`,
      needsReconnect: isAuthError(res),
    };
  }

  return { ok: true, name: res.data.name ?? creds.wabaId, checkedAt: new Date() };
}

/**
 * Meta caps coexistence numbers at 20 messages/sec regardless of tier.
 * Broadcast throughput must respect that ceiling even if the env var is higher.
 */
export const COEXISTENCE_MAX_MPS = 20;

export function effectiveSendRate(
  configuredRate: number,
  isCoexistence: boolean,
): number {
  return isCoexistence ? Math.min(configuredRate, COEXISTENCE_MAX_MPS) : configuredRate;
}
