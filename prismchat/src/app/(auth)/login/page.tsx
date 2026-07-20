import Link from "next/link";
import { AuthForm } from "@/components/auth/AuthForm";
import { loginAction } from "@/app/(auth)/actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold">Welcome back</h1>
      <p className="mb-5 text-sm text-muted">Sign in to your PrismChat account.</p>
      <AuthForm
        action={loginAction}
        submitLabel="Sign in"
        hidden={{ callbackUrl: callbackUrl ?? "/app/dashboard" }}
        fields={[
          { name: "email", label: "Email", type: "email", autoComplete: "email" },
          {
            name: "password",
            label: "Password",
            type: "password",
            autoComplete: "current-password",
          },
        ]}
      />
      <p className="mt-3 text-center text-sm">
        <Link href="/forgot-password" className="text-brand-600 hover:underline">
          Forgot your password?
        </Link>
      </p>
      <p className="mt-4 text-center text-sm text-muted">
        PrismChat is invite-only. Ask your workspace admin to send you an
        invitation.
      </p>
    </div>
  );
}
