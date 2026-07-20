import "dotenv/config";
import readline from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/lib/password";

/**
 * Bootstrap the first workspace + admin user. PrismChat is invite-only, so this
 * is how the very first account is created (every later user is invited from
 * Settings → Team).
 *
 *   pnpm bootstrap:admin
 *
 * Non-interactive (e.g. in a deploy shell):
 *   ADMIN_EMAIL=x@y.com ADMIN_PASSWORD=secret ADMIN_NAME="Owner" \
 *   BUSINESS_NAME="Cookery Shop" pnpm bootstrap:admin
 */

function slugify(input: string) {
  const base = input.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
  return `${base || "ws"}-${Math.random().toString(36).slice(2, 7)}`;
}

async function main() {
  let name = process.env.ADMIN_NAME;
  let email = process.env.ADMIN_EMAIL;
  let password = process.env.ADMIN_PASSWORD;
  let business = process.env.BUSINESS_NAME;

  if (!name || !email || !password || !business) {
    const rl = readline.createInterface({ input: stdin, output: stdout });
    business ||= await rl.question("Business / workspace name: ");
    name ||= await rl.question("Your name: ");
    email ||= await rl.question("Your email: ");
    password ||= await rl.question("Password (min 8 chars): ");
    rl.close();
  }

  email = email.toLowerCase().trim();
  if (password.length < 8) throw new Error("Password must be at least 8 characters");

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error(`A user with ${email} already exists`);

  const passwordHash = await hashPassword(password);

  await prisma.$transaction(async (tx) => {
    const client = await tx.client.create({
      data: { name: business!, slug: slugify(business!), ownerEmail: email! },
    });
    const workspace = await tx.workspace.create({
      data: { clientId: client.id, name: business!, slug: slugify(business!) },
    });
    const user = await tx.user.create({
      data: { name: name!, email: email!, passwordHash, emailVerified: new Date() },
    });
    await tx.workspaceUser.create({
      data: { workspaceId: workspace.id, userId: user.id, role: "admin" },
    });
  });

  console.log(`\n✅ Admin created: ${email}`);
  console.log(`   Workspace: ${business}`);
  console.log(`   Sign in at ${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/login\n`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(`\n❌ ${e.message}\n`);
  await prisma.$disconnect();
  process.exit(1);
});
