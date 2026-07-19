import { requireUser } from "@/lib/session";

// Reached only when a logged-in user has no workspace membership. Registration
// creates a workspace, so this is a rare fallback for invited/edge accounts.
export default async function OnboardingPage() {
  const user = await requireUser();

  return (
    <div className="flex min-h-screen items-center justify-center px-4 text-center">
      <div className="max-w-md">
        <h1 className="text-2xl font-semibold">No workspace yet</h1>
        <p className="mt-2 text-muted">
          Hi {user.name}, your account isn&apos;t part of a workspace. Ask an
          admin to invite you, or contact support.
        </p>
      </div>
    </div>
  );
}
