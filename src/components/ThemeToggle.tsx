"use client"

import * as React from "react"
import { useTheme } from "next-themes"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const current = mounted ? (theme || "light") : "light"

  const options = [
    { id: "light", label: "Terang" },
    { id: "dark", label: "Gelap" },
    { id: "system", label: "Sistem" },
  ] as const

  return (
    <div
      role="group"
      aria-label="Pilih tema tampilan"
      className="flex items-center p-space-2xs rounded-lg bg-surface-container-high text-on-surface-variant"
    >
      {options.map((opt) => {
        const active = current === opt.id
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => setTheme(opt.id)}
            aria-pressed={active}
            className={
              active
                ? "px-space-sm py-space-2xs rounded bg-surface-container-lowest text-on-surface font-caption-medium text-caption-medium shadow-sm transition-all cursor-pointer"
                : "px-space-sm py-space-2xs rounded text-on-surface-variant hover:text-on-surface font-caption text-caption transition-all cursor-pointer"
            }
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
