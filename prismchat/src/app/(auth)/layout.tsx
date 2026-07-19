import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <Link href="/" className="mb-6 flex items-center gap-2">
        <span className="grid size-8 place-items-center rounded-lg bg-brand-600 font-bold text-white">
          P
        </span>
        <span className="text-lg font-semibold">PrismChat</span>
      </Link>
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-sm">
        {children}
      </div>
    </div>
  );
}
