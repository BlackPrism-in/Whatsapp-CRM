import Link from "next/link";
import { AuthForm } from "@/components/auth/AuthForm";
import { registerAction } from "@/app/(auth)/actions";

export default function RegisterPage() {
  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold">Create your account</h1>
      <p className="mb-5 text-sm text-muted">
        Start engaging your customers on WhatsApp.
      </p>
      <AuthForm
        action={registerAction}
        submitLabel="Create account"
        fields={[
          { name: "name", label: "Your name", autoComplete: "name" },
          { name: "businessName", label: "Business name", autoComplete: "organization" },
          { name: "email", label: "Email", type: "email", autoComplete: "email" },
          {
            name: "password",
            label: "Password",
            type: "password",
            autoComplete: "new-password",
          },
        ]}
      />
      <p className="mt-5 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-brand-600">
          Sign in
        </Link>
      </p>
    </div>
  );
}
