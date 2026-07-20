import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AcceptInviteForm } from "@/components/auth/AcceptInviteForm";

export default async function AcceptInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invitation = await prisma.invitation.findUnique({ where: { token } });
  const workspace = invitation
    ? await prisma.workspace.findUnique({ where: { id: invitation.workspaceId } })
    : null;

  const invalid = !invitation || !!invitation.acceptedAt || invitation.expiresAt < new Date();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <Link href="/" className="mb-6 flex items-center gap-2">
        <span className="grid size-8 place-items-center rounded-lg bg-brand-600 font-bold text-white">
          P
        </span>
        <span className="text-lg font-semibold">PrismChat</span>
      </Link>

      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-sm">
        {invalid ? (
          <>
            <h1 className="mb-1 text-xl font-semibold">Invitation not valid</h1>
            <p className="text-sm text-muted">
              This invite has already been used or has expired. Ask an admin to
              send you a new one.
            </p>
            <Link href="/login" className="mt-4 inline-block text-sm font-medium text-brand-600">
              Go to sign in
            </Link>
          </>
        ) : (
          <>
            <h1 className="mb-1 text-xl font-semibold">
              Join {workspace?.name ?? "your team"}
            </h1>
            <p className="mb-5 text-sm text-muted">
              Setting up access for <strong>{invitation.email}</strong>. Choose a
              password to finish.
            </p>
            <AcceptInviteForm token={token} />
          </>
        )}
      </div>
    </div>
  );
}
