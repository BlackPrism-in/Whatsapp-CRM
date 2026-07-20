"use server";

import { z } from "zod";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { rateLimit, rateLimitReset, getClientIp } from "@/lib/rate-limit";

// signIn() with redirectTo throws a Next redirect internally; it must be
// rethrown so navigation happens. Detect it by its digest (stable public shape).
function isRedirectError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

export type ActionState = { error?: string } | undefined;

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
});

export async function loginAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const email = parsed.data.email.toLowerCase().trim();
  const callbackUrl = String(formData.get("callbackUrl") || "/app/dashboard");

  // Throttle brute-force: max 8 attempts per 10 min, keyed on IP + email.
  const ip = await getClientIp();
  const limit = await rateLimit("login", `${ip}:${email}`, { max: 8, windowSec: 600 });
  if (!limit.allowed) {
    const mins = Math.ceil(limit.retryAfterSec / 60);
    return {
      error: `Too many attempts. Try again in ${mins} minute${mins === 1 ? "" : "s"}.`,
    };
  }

  try {
    await signIn("credentials", {
      email,
      password: parsed.data.password,
      redirectTo: callbackUrl,
    });
  } catch (error) {
    // A successful sign-in throws the redirect — clear the counter on success.
    if (isRedirectError(error)) {
      await rateLimitReset("login", `${ip}:${email}`);
      throw error;
    }
    if (error instanceof AuthError) {
      return { error: "Invalid email or password" };
    }
    return { error: "Something went wrong. Please try again." };
  }
}
