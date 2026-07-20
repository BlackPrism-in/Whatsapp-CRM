import crypto from "node:crypto";

export type SignatureCheck =
  | { ok: true; mode: "verified" | "dev-bypass" }
  | { ok: false; reason: string };

/**
 * Verify Meta's `X-Hub-Signature-256` header against the RAW request body.
 *
 * Meta computes HMAC-SHA256(rawBody, APP_SECRET) and sends it as
 * `sha256=<hex>`. The body must be the exact bytes received — re-serialising
 * parsed JSON will not match.
 *
 * Security posture:
 *  - Production without META_APP_SECRET → reject (fail closed).
 *  - Development without META_APP_SECRET → allow, so simulated payloads work
 *    locally. This bypass can never trigger in production.
 */
export function verifyMetaSignature(
  rawBody: string,
  signatureHeader: string | null,
): SignatureCheck {
  const secret = process.env.META_APP_SECRET;
  const isProduction = process.env.NODE_ENV === "production";

  if (!secret) {
    if (isProduction) {
      return { ok: false, reason: "META_APP_SECRET is not configured" };
    }
    console.warn(
      "[webhook] META_APP_SECRET not set — skipping signature check (development only)",
    );
    return { ok: true, mode: "dev-bypass" };
  }

  if (!signatureHeader) {
    return { ok: false, reason: "Missing X-Hub-Signature-256 header" };
  }

  const [algo, provided] = signatureHeader.split("=");
  if (algo !== "sha256" || !provided) {
    return { ok: false, reason: "Malformed signature header" };
  }

  const expected = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");

  const providedBuf = Buffer.from(provided, "hex");
  const expectedBuf = Buffer.from(expected, "hex");

  // timingSafeEqual throws on length mismatch — check first.
  if (providedBuf.length !== expectedBuf.length) {
    return { ok: false, reason: "Signature mismatch" };
  }
  if (!crypto.timingSafeEqual(providedBuf, expectedBuf)) {
    return { ok: false, reason: "Signature mismatch" };
  }

  return { ok: true, mode: "verified" };
}
