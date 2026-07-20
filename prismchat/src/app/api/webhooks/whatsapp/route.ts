import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { processWebhook } from "@/modules/inbox/inbound";
import { verifyMetaSignature } from "@/lib/webhook-security";

/**
 * Meta webhook verification handshake. Meta calls GET with hub.challenge; we
 * echo it back if the verify token matches a connected WABA (hashed compare)
 * or the global env token.
 */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");

  if (mode !== "subscribe" || !token) {
    return new NextResponse("Bad Request", { status: 400 });
  }

  const globalToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
  if (globalToken && token === globalToken) {
    return new NextResponse(challenge ?? "", { status: 200 });
  }

  const hash = crypto.createHash("sha256").update(token).digest("hex");
  const waba = await prisma.whatsappBusinessAccount.findFirst({
    where: { webhookVerifyTokenHash: hash },
  });
  if (waba) {
    return new NextResponse(challenge ?? "", { status: 200 });
  }

  return new NextResponse("Forbidden", { status: 403 });
}

export async function POST(req: NextRequest) {
  // Read the RAW body — the HMAC is computed over the exact bytes Meta sent,
  // so parsing and re-serialising would break verification.
  const rawBody = await req.text();

  const check = verifyMetaSignature(rawBody, req.headers.get("x-hub-signature-256"));
  if (!check.ok) {
    console.warn(`[whatsapp webhook] rejected: ${check.reason}`);
    return new NextResponse("Invalid signature", { status: 401 });
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return new NextResponse("Bad Request", { status: 400 });
  }

  // Always ack fast; process inline (small payloads). Errors are swallowed so
  // Meta doesn't retry-storm — failures are logged.
  try {
    await processWebhook(body as Parameters<typeof processWebhook>[0]);
  } catch (e) {
    console.error("[whatsapp webhook] processing error:", e);
  }

  return NextResponse.json({ received: true });
}
