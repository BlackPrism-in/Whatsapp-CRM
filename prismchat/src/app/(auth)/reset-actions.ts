"use server";

import crypto from "node:crypto";
import { z } from "zod";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { sendMail, resetPasswordEmail } from "@/lib/mail";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export type ResetState = { error?: string; sent?: boolean; ok?: boolean } | undefined;

function isRedirectError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

const RESET_TTL_MIN = 60;

function resetUrl(token: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base}/reset-password/${token}`;
}

/**
 * Request a password reset. Always reports success — never reveals whether an
 * email is registered (prevents account enumeration). Rate-limited to stop
 * email-bombing a known address.
 */
export async function requestPasswordReset(
  _prev: ResetState,
  formData: FormData,
): Promise<ResetState> {
  const email = z.string().email().safeParse(
    String(formData.get("email") ?? "").toLowerCase().trim(),
  );
  if (!email.success) return { error: "Enter a valid email" };

  const ip = await getClientIp();
  const limit = await rateLimit("pwreset", `${ip}:${email.data}`, { max: 5, windowSec: 900 });
  if (!limit.allowed) {
    return { error: "Too many requests. Please try again later." };
  }

  const user = await prisma.user.findUnique({ where: { email: email.data } });
  if (user && user.passwordHash) {
    // Invalidate any outstanding reset tokens for this email.
    await prisma.magicLink.deleteMany({ where: { email: email.data, usedAt: null } });

    const token = crypto.randomBytes(32).toString("hex");
    await prisma.magicLink.create({
      data: {
        email: email.data,
        token,
        expiresAt: new Date(Date.now() + RESET_TTL_MIN * 60 * 1000),
      },
    });
    const mail = resetPasswordEmail({ url: resetUrl(token) });
    await sendMail({ to: email.data, ...mail });
  }

  // Uniform response regardless of whether the account exists.
  return { sent: true };
}

const resetSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
});

/** Complete a reset: verify the token, set the new password, sign in. */
export async function resetPassword(
  token: string,
  _prev: ResetState,
  formData: FormData,
): Promise<ResetState> {
  const parsed = resetSchema.safeParse({ password: formData.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const link = await prisma.magicLink.findUnique({ where: { token } });
  if (!link || link.usedAt || link.expiresAt < new Date()) {
    return { error: "This reset link is invalid or has expired. Request a new one." };
  }

  const passwordHash = await hashPassword(parsed.data.password);

  await prisma.$transaction([
    prisma.user.update({
      where: { email: link.email },
      data: { passwordHash, status: "active" },
    }),
    prisma.magicLink.update({ where: { id: link.id }, data: { usedAt: new Date() } }),
  ]);

  try {
    await signIn("credentials", {
      email: link.email,
      password: parsed.data.password,
      redirectTo: "/app/dashboard",
    });
  } catch (error) {
    if (isRedirectError(error)) throw error;
    if (error instanceof AuthError) return { error: "Password reset — please sign in." };
    return { error: "Password reset — please sign in." };
  }
}
