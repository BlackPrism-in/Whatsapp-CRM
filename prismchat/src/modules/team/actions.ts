"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, requireWorkspace, getCurrentUser } from "@/lib/session";
import { sendMail, inviteEmail } from "@/lib/mail";

export type TeamState =
  | { error?: string; ok?: boolean; message?: string; inviteUrl?: string }
  | undefined;

const INVITE_TTL_DAYS = 7;

const inviteSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  role: z.enum(["admin", "manager", "staff"]),
});

function inviteUrlFor(token: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base}/accept-invite/${token}`;
}

/**
 * Admin invites a teammate. Creates a one-time invitation and emails a link to
 * set a password. The URL is also returned so the admin can share it manually
 * if email delivery isn't configured yet.
 */
export async function inviteMember(_prev: TeamState, formData: FormData): Promise<TeamState> {
  const { workspace } = await requireRole("admin");
  const inviter = await getCurrentUser();

  const parsed = inviteSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role") ?? "staff",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const email = parsed.data.email.toLowerCase();

  // Already a member?
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    const member = await prisma.workspaceUser.findUnique({
      where: { workspaceId_userId: { workspaceId: workspace.id, userId: existingUser.id } },
    });
    if (member) return { error: "That person is already a member of this workspace" };
  }

  // Replace any outstanding invite for this email/workspace.
  await prisma.invitation.deleteMany({
    where: { workspaceId: workspace.id, email, acceptedAt: null },
  });

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);

  await prisma.invitation.create({
    data: { workspaceId: workspace.id, email, role: parsed.data.role, token, expiresAt },
  });

  const url = inviteUrlFor(token);
  const mail = inviteEmail({
    inviterName: inviter?.name ?? "An admin",
    workspaceName: workspace.name,
    url,
  });
  const sent = await sendMail({ to: email, ...mail });

  revalidatePath("/app/settings/team");

  if (!sent.ok) {
    return {
      ok: true,
      inviteUrl: url,
      message: `Invite created, but email failed to send (${sent.error}). Share this link manually.`,
    };
  }
  return {
    ok: true,
    inviteUrl: url,
    message: sent.devFallback
      ? "Invite created. Email isn't configured, so share this link manually."
      : `Invite sent to ${email}.`,
  };
}

export async function revokeInvite(id: string): Promise<void> {
  const { workspace } = await requireRole("admin");
  await prisma.invitation.deleteMany({ where: { id, workspaceId: workspace.id } });
  revalidatePath("/app/settings/team");
}

export async function removeMember(userId: string): Promise<void> {
  const { workspace } = await requireRole("admin");
  const current = await getCurrentUser();
  if (current?.id === userId) return; // never remove yourself

  // Don't strand the workspace without an admin.
  const admins = await prisma.workspaceUser.count({
    where: { workspaceId: workspace.id, role: "admin" },
  });
  const target = await prisma.workspaceUser.findUnique({
    where: { workspaceId_userId: { workspaceId: workspace.id, userId } },
  });
  if (target?.role === "admin" && admins <= 1) return;

  await prisma.workspaceUser.deleteMany({ where: { workspaceId: workspace.id, userId } });
  revalidatePath("/app/settings/team");
}

export async function changeMemberRole(userId: string, role: string): Promise<void> {
  const { workspace } = await requireRole("admin");
  if (!["admin", "manager", "staff"].includes(role)) return;
  await prisma.workspaceUser.updateMany({
    where: { workspaceId: workspace.id, userId },
    data: { role },
  });
  revalidatePath("/app/settings/team");
}

export async function listTeam() {
  const { workspace } = await requireWorkspace();
  const [members, invites] = await Promise.all([
    prisma.workspaceUser.findMany({
      where: { workspaceId: workspace.id },
      include: { user: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.invitation.findMany({
      where: { workspaceId: workspace.id, acceptedAt: null },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  return { members, invites };
}
