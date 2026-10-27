"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

// Filter out React 19's warning for next-themes inline script tag and browser extension hydration mismatches
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  const originalError = console.error;
  console.error = (...args: unknown[]) => {
    const errorMsg = typeof args[0] === "string" ? args[0] : "";
    const allArgsStr = args.map(a => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" ");
    if (
      errorMsg.includes("Encountered a script tag") ||
      allArgsStr.includes("bis_skin_checked") ||
      allArgsStr.includes("bis_register")
    ) {
      return;
    }
    originalError.apply(console, args);
  };
}

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
