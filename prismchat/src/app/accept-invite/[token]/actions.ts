"use server";

import { z } from "zod";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";

export type AcceptState = { error?: string } | undefined;

function isRedirectError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

const acceptSchema = z.object({
  name: z.string().trim().min(2, "Enter your name"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

/**
 * Accept an invitation: create (or activate) the user, set their password, and
 * attach them to the workspace with the invited role. Then sign them in.
 */
export async function acceptInvite(
  token: string,
  _prev: AcceptState,
  formData: FormData,
): Promise<AcceptState> {
  const parsed = acceptSchema.safeParse({
    name: formData.get("name"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const invitation = await prisma.invitation.findUnique({ where: { token } });
  if (!invitation || invitation.acceptedAt) {
    return { error: "This invitation is no longer valid." };
  }
  if (invitation.expiresAt < new Date()) {
    return { error: "This invitation has expired. Ask an admin to send a new one." };
  }

  const passwordHash = await hashPassword(parsed.data.password);

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.upsert({
      where: { email: invitation.email },
      create: {
        email: invitation.email,
        name: parsed.data.name,
        passwordHash,
        status: "active",
        emailVerified: new Date(),
      },
      update: { name: parsed.data.name, passwordHash, status: "active" },
    });

    await tx.workspaceUser.upsert({
      where: { workspaceId_userId: { workspaceId: invitation.workspaceId, userId: user.id } },
      create: { workspaceId: invitation.workspaceId, userId: user.id, role: invitation.role },
      update: { role: invitation.role },
    });

    await tx.invitation.update({
      where: { id: invitation.id },
      data: { acceptedAt: new Date() },
    });
  });

  try {
    await signIn("credentials", {
      email: invitation.email,
      password: parsed.data.password,
      redirectTo: "/app/dashboard",
    });
  } catch (error) {
    if (isRedirectError(error)) throw error;
    if (error instanceof AuthError) return { error: "Account created — please sign in." };
    return { error: "Account created — please sign in." };
  }
}
