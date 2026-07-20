"use client";

import { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";

type Theme = "light" | "dark" | "system";

function apply(theme: Theme) {
  const dark =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

const ICONS: Record<Theme, typeof Sun> = { light: Sun, dark: Moon, system: Monitor };
const ORDER: Theme[] = ["light", "dark", "system"];

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>("system");

  // Hydrate from storage after mount (avoids SSR mismatch).
  useEffect(() => {
    const stored = (localStorage.getItem("theme") as Theme | null) ?? "system";
    setTheme(stored);
  }, []);

  // Keep "system" in sync with OS changes.
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => apply("system");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  function cycle() {
    const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];
    setTheme(next);
    localStorage.setItem("theme", next);
    apply(next);
  }

  const Icon = ICONS[theme];

  return (
    <button
      type="button"
      onClick={cycle}
      title={`Theme: ${theme} (click to change)`}
      aria-label={`Switch theme, currently ${theme}`}
      className={`grid size-9 place-items-center rounded-lg border border-border text-muted transition hover:bg-surface-subtle hover:text-foreground ${className}`}
    >
      <Icon className="size-4" />
    </button>
  );
}
