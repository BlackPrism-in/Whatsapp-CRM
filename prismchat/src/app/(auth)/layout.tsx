import Link from "next/link";
import { Zap, TrendingUp, Bot } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

const FEATURES = [
  { icon: Zap, text: "Automate follow-ups and reclaim 10+ hours a week" },
  { icon: TrendingUp, text: "Reach thousands of customers with one broadcast" },
  { icon: Bot, text: "24/7 chatbots that qualify leads while you sleep" },
];

const PROOF = [
  { value: "5,000+", label: "Contacts per workspace" },
  { value: "Official", label: "WhatsApp Cloud API" },
  { value: "Encrypted", label: "Tokens at rest" },
];

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* Left brand pane (desktop) */}
      <div
        className="relative hidden w-[45%] flex-col justify-between overflow-hidden p-10 text-white lg:flex"
        style={{ background: "#283f24" }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 65% at 65% 50%, rgba(118,168,78,0.30) 0%, rgba(118,168,78,0.10) 45%, transparent 70%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        <Link href="/" className="relative flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-xl bg-brand-500 font-bold text-white">
            P
          </span>
          <span className="text-xl font-bold tracking-tight">PrismChat</span>
        </Link>

        <div className="relative space-y-5">
          <h2 className="max-w-sm text-2xl font-bold leading-snug">
            The customer engagement platform for WhatsApp-first businesses.
          </h2>
          <ul className="space-y-3">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <li key={f.text} className="flex items-start gap-3">
                  <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-white/10">
                    <Icon className="size-4 text-brand-300" />
                  </span>
                  <span className="text-sm text-white/90">{f.text}</span>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="relative grid grid-cols-3 gap-4 border-t border-white/10 pt-6">
          {PROOF.map((p) => (
            <div key={p.label}>
              <div className="text-lg font-bold">{p.value}</div>
              <div className="text-xs text-white/60">{p.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right form pane */}
      <div className="relative flex flex-1 flex-col items-center justify-center bg-background px-4 py-10">
        <div className="absolute right-4 top-4">
          <ThemeToggle />
        </div>
        <Link href="/" className="mb-6 flex items-center gap-2 lg:hidden">
          <span className="grid size-8 place-items-center rounded-xl bg-brand-600 font-bold text-white">
            P
          </span>
          <span className="text-lg font-semibold">PrismChat</span>
        </Link>
        <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-sm">
          {children}
        </div>
      </div>
    </div>
  );
}
