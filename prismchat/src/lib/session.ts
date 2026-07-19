import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const ACTIVE_WS_COOKIE = "active_ws";

export type Role = "admin" | "manager" | "staff";

// Role hierarchy for permission checks (higher index = more power).
const ROLE_RANK: Record<Role, number> = { staff: 0, manager: 1, admin: 2 };

/** Current authenticated user (or null). */
export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return prisma.user.findUnique({ where: { id: session.user.id } });
}

/** Require a logged-in user; redirect to /login otherwise. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** All workspace memberships for a user, with workspace + role. */
export async function getMemberships(userId: string) {
  return prisma.workspaceUser.findMany({
    where: { userId },
    include: { workspace: true },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * Resolve the active workspace for the current user. Uses the `active_ws`
 * cookie when it points at a workspace the user belongs to, otherwise falls
 * back to their first membership. Returns null if the user has no workspaces.
 */
export async function getActiveWorkspace() {
  const user = await getCurrentUser();
  if (!user) return null;

  const memberships = await getMemberships(user.id);
  if (memberships.length === 0) return null;

  const cookieStore = await cookies();
  const preferred = cookieStore.get(ACTIVE_WS_COOKIE)?.value;

  const active =
    memberships.find((m) => m.workspaceId === preferred) ?? memberships[0];

  return {
    workspace: active.workspace,
    role: active.role as Role,
    memberships,
  };
}

/** Require an active workspace context; redirect if none. */
export async function requireWorkspace() {
  const ctx = await getActiveWorkspace();
  if (!ctx) redirect("/onboarding");
  return ctx;
}

/** Require the active-workspace role to meet or exceed `min`. */
export async function requireRole(min: Role) {
  const ctx = await requireWorkspace();
  if (ROLE_RANK[ctx.role] < ROLE_RANK[min]) redirect("/app/dashboard");
  return ctx;
}

export function hasRole(role: Role, min: Role) {
  return ROLE_RANK[role] >= ROLE_RANK[min];
}

export { ACTIVE_WS_COOKIE };
