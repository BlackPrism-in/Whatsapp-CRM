import Link from "next/link";
import {
  Users,
  Megaphone,
  MessageSquare,
  Workflow,
  Bot,
  BarChart3,
} from "lucide-react";

const features = [
  {
    icon: Users,
    title: "Contacts & Segments",
    body: "Import 5,000+ contacts from CSV/Excel, tag them, and build dynamic segments.",
  },
  {
    icon: Megaphone,
    title: "WhatsApp Broadcasting",
    body: "Send approved templates, images and PDFs to thousands over the official Cloud API.",
  },
  {
    icon: MessageSquare,
    title: "Shared Team Inbox",
    body: "Reply in real time, assign conversations, and hand off between bot and staff.",
  },
  {
    icon: Workflow,
    title: "Automation",
    body: "Visual workflows: welcome series, follow-ups, reminders — triggered automatically.",
  },
  {
    icon: Bot,
    title: "AI Chatbots",
    body: "Answer FAQs and qualify leads from your own knowledge base, then hand over to a human.",
  },
  {
    icon: BarChart3,
    title: "Analytics",
    body: "Track delivered, read, replied and campaign ROI across every channel.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#162610] text-white">
      {/* Nav */}
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-xl bg-brand-600 font-bold text-white">
            P
          </span>
          <span className="text-lg font-bold tracking-tight">PrismChat</span>
        </div>
        <Link
          href="/login"
          className="rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg transition hover:opacity-90"
        >
          Sign in
        </Link>
      </header>

      {/* Hero */}
      <section
        className="relative overflow-hidden"
        style={{
          background:
            "radial-gradient(ellipse 70% 65% at 62% 40%, rgba(118,168,78,0.22) 0%, rgba(74,222,128,0.08) 40%, transparent 70%)",
        }}
      >
        {/* Grid overlay */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
            maskImage:
              "radial-gradient(ellipse 80% 80% at 50% 0%, black 40%, transparent 100%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 80% 80% at 50% 0%, black 40%, transparent 100%)",
          }}
        />

        <div className="relative mx-auto max-w-6xl px-6 pt-16 pb-20 text-center sm:pt-24">
          <div className="mb-6 flex justify-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-500/30 bg-brand-500/20 px-3 py-1 text-xs font-semibold text-brand-300">
              <span className="inline-block size-1.5 rounded-full bg-brand-400" />
              Official WhatsApp Cloud API
            </span>
          </div>

          <h1 className="mx-auto max-w-4xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            The customer engagement platform for WhatsApp-first businesses
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-neutral-300 sm:text-xl">
            Broadcast, converse, automate and sell — reach thousands of customers
            on WhatsApp, SMS and email from one place.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-7 py-3.5 text-base font-bold text-white shadow-lg transition hover:opacity-90"
            >
              Sign in to your workspace
            </Link>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-neutral-400">
            <span>✓ Encrypted at rest</span>
            <span>✓ Multi-channel</span>
            <span>✓ Built for 5,000+ contacts</span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="rounded-2xl border border-white/10 bg-white/5 p-6 transition hover:border-brand-500/40 hover:bg-white/[0.07]"
              >
                <div className="mb-4 grid size-11 place-items-center rounded-xl bg-brand-500/20 text-brand-300">
                  <Icon className="size-5" />
                </div>
                <h3 className="font-semibold text-white">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-400">
                  {f.body}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <footer className="border-t border-white/10 px-6 py-8 text-center text-sm text-neutral-500">
        © {new Date().getFullYear()} PrismChat · A BlackPrism product
      </footer>
    </main>
  );
}
