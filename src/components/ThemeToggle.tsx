"use client";

import * as React from "react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === "dark";

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
  };

  return (
    <button
      type="button"
      suppressHydrationWarning
      onClick={toggleTheme}
      aria-label={isDark ? "Ganti ke mode terang" : "Ganti ke mode gelap"}
      title={isDark ? "Mode Terang" : "Mode Gelap"}
      className="w-9 h-9 rounded-full border border-[#0a2618]/20 hover:border-[#006837]/50 dark:border-white/20 dark:hover:border-emerald-300/50 bg-white/70 hover:bg-white dark:bg-white/[0.06] dark:hover:bg-white/15 backdrop-blur-md flex items-center justify-center text-[#0a2618] dark:text-white/80 dark:hover:text-white transition-all duration-300 hover:scale-105 shadow-xs dark:shadow-none hover:shadow-[0_0_16px_rgba(16,185,129,0.2)] active:scale-95 cursor-pointer"
    >
      <span className="material-symbols-outlined text-[18px]">
        {isDark ? "light_mode" : "dark_mode"}
      </span>
    </button>
  );
}
