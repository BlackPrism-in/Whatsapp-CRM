import Link from "next/link";

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
          <Link href="/" className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg bg-brand-600 font-bold text-white">
              P
            </span>
            <span className="text-lg font-semibold">PrismChat</span>
          </Link>
          <nav className="flex gap-4 text-sm text-muted">
            <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
            <Link href="/terms" className="hover:text-foreground">Terms</Link>
            <Link href="/data-deletion" className="hover:text-foreground">Data deletion</Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <article className="space-y-6 [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mt-6 [&_h3]:font-medium [&_li]:text-muted [&_p]:leading-relaxed [&_p]:text-muted [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
          {children}
        </article>
      </main>

      <footer className="border-t border-border px-6 py-8 text-center text-sm text-muted">
        © {new Date().getFullYear()} BlackPrism Private Limited · PrismChat
      </footer>
    </div>
  );
}
