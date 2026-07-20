import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const link = await prisma.magicLink.findUnique({ where: { token } });
  const invalid = !link || !!link.usedAt || link.expiresAt < new Date();

  return (
    <div>
      {invalid ? (
        <>
          <h1 className="mb-1 text-xl font-semibold">Link expired</h1>
          <p className="text-sm text-muted">
            This password reset link is invalid or has already been used.
          </p>
          <Link
            href="/forgot-password"
            className="mt-4 inline-block text-sm font-medium text-brand-600"
          >
            Request a new link
          </Link>
        </>
      ) : (
        <>
          <h1 className="mb-1 text-xl font-semibold">Choose a new password</h1>
          <p className="mb-5 text-sm text-muted">
            Setting a new password for <strong>{link.email}</strong>.
          </p>
          <ResetPasswordForm token={token} />
        </>
      )}
    </div>
  );
}
