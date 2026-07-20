"use server";

import { z } from "zod";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";

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

  const callbackUrl = String(formData.get("callbackUrl") || "/app/dashboard");

  try {
    await signIn("credentials", {
      email: parsed.data.email.toLowerCase().trim(),
      password: parsed.data.password,
      redirectTo: callbackUrl,
    });
  } catch (error) {
    if (isRedirectError(error)) throw error;
    if (error instanceof AuthError) {
      return { error: "Invalid email or password" };
    }
    return { error: "Something went wrong. Please try again." };
  }
}
