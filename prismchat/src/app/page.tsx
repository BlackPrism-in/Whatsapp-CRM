import Link from "next/link";

const features = [
  {
    title: "Contacts & Segments",
    body: "Import 5,000+ contacts from CSV/Excel, tag them, and build dynamic segments.",
  },
  {
    title: "WhatsApp Broadcasting",
    body: "Send approved templates, images and PDFs to thousands over the official Cloud API.",
  },
  {
    title: "Shared Team Inbox",
    body: "Reply in real time, assign conversations, and hand off between bot and staff.",
  },
  {
    title: "Automation",
    body: "Visual workflows: welcome series, follow-ups, reminders — triggered automatically.",
  },
  {
    title: "AI Chatbots",
    body: "Answer FAQs and qualify leads from your own knowledge base, then hand over to a human.",
  },
  {
    title: "Analytics",
    body: "Track delivered, read, replied and campaign ROI across every channel.",
  },
];

export default function Home() {
  return (
    <main className="flex flex-col">
      <header className="flex items-center justify-between px-6 py-5 md:px-10">
        <div className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-lg bg-brand-600 font-bold text-white">
            P
          </span>
          <span className="text-lg font-semibold">PrismChat</span>
        </div>
        <nav className="flex items-center gap-3 text-sm">
          <Link
            href="/login"
            className="rounded-lg bg-brand-600 px-4 py-2 font-medium text-white transition hover:bg-brand-700"
          >
            Sign in
          </Link>
        </nav>
      </header>

      <section className="mx-auto max-w-3xl px-6 pt-16 pb-12 text-center md:pt-24">
        <span className="inline-block rounded-full bg-accent-200 px-3 py-1 text-xs font-semibold text-accent-900">
          Official WhatsApp Cloud API
        </span>
        <h1 className="mt-5 text-4xl font-bold tracking-tight md:text-5xl">
          The customer engagement platform for WhatsApp-first businesses
        </h1>
        <p className="mt-5 text-lg text-muted">
          Broadcast, converse, automate and sell — reach thousands of customers
          on WhatsApp, SMS and email from one place.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link
            href="/login"
            className="rounded-lg bg-brand-600 px-6 py-3 font-medium text-white transition hover:bg-brand-700"
          >
            Sign in to your workspace
          </Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-4 px-6 pb-24 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <div
            key={f.title}
            className="rounded-xl border border-border bg-surface p-5"
          >
            <h3 className="font-semibold text-brand-700">{f.title}</h3>
            <p className="mt-2 text-sm text-muted">{f.body}</p>
          </div>
        ))}
      </section>

      <footer className="border-t border-border px-6 py-6 text-center text-sm text-muted">
        © {new Date().getFullYear()} PrismChat
      </footer>
    </main>
  );
}
