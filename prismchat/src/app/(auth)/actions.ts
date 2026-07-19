"use server";

import { z } from "zod";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";

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

function slugify(input: string) {
  const base = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `${base || "ws"}-${Math.random().toString(36).slice(2, 7)}`;
}

const registerSchema = z.object({
  name: z.string().min(2, "Enter your name"),
  businessName: z.string().min(2, "Enter your business name"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type ActionState = { error?: string } | undefined;

export async function registerAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    businessName: formData.get("businessName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { name, businessName, email, password } = parsed.data;
  const normalizedEmail = email.toLowerCase().trim();

  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });
  if (existing) return { error: "An account with that email already exists" };

  const passwordHash = await hashPassword(password);

  // Create the full tenant graph: Client → Workspace → User (owner/admin).
  await prisma.$transaction(async (tx) => {
    const client = await tx.client.create({
      data: {
        name: businessName,
        slug: slugify(businessName),
        ownerEmail: normalizedEmail,
      },
    });
    const workspace = await tx.workspace.create({
      data: {
        clientId: client.id,
        name: businessName,
        slug: slugify(businessName),
      },
    });
    const user = await tx.user.create({
      data: { name, email: normalizedEmail, passwordHash },
    });
    await tx.workspaceUser.create({
      data: { workspaceId: workspace.id, userId: user.id, role: "admin" },
    });
  });

  try {
    await signIn("credentials", {
      email: normalizedEmail,
      password,
      redirectTo: "/app/dashboard",
    });
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return { error: "Account created — please sign in." };
  }
}

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
