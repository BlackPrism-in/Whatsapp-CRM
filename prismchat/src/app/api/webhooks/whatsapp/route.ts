import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { processWebhook } from "@/modules/inbox/inbound";

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
  let body: unknown;
  try {
    body = await req.json();
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
