import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { encrypt } from "../src/lib/crypto";

// Seed a test WABA + phone number so the webhook/inbox can be exercised without
// a live Meta connection. The token is a dummy — real sends will fail.
async function main() {
  const ws = await prisma.workspace.findFirst({ orderBy: { createdAt: "asc" } });
  if (!ws) throw new Error("no workspace");

  const waba = await prisma.whatsappBusinessAccount.upsert({
    where: { wabaId: "100000000000001" },
    create: {
      workspaceId: ws.id,
      wabaId: "100000000000001",
      name: "Test WABA",
      accessToken: encrypt("DUMMY_TOKEN"),
      status: "connected",
    },
    update: {},
  });

  await prisma.whatsappPhoneNumber.upsert({
    where: { phoneNumberId: "200000000000002" },
    create: {
      wabaId: waba.id,
      phoneNumberId: "200000000000002",
      displayNumber: "+91 98765 00000",
      name: "Cookery Shop",
      status: "CONNECTED",
    },
    update: {},
  });

  await prisma.channelAccount.upsert({
    where: { id: waba.id },
    create: {
      id: waba.id,
      workspaceId: ws.id,
      channel: "whatsapp",
      provider: "meta_cloud",
      displayName: "Test WABA",
      businessAccountId: waba.wabaId,
      status: "active",
    },
    update: {},
  });

  console.log("Seeded WABA + phone for workspace:", ws.name);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
