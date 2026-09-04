"use client";

import { useEffect, useRef, useState } from "react";
import { Palette, Check } from "lucide-react";
import { THEMES, useTheme } from "./ThemeProvider";

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = THEMES.find((t) => t.id === theme) ?? THEMES[0];

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="focus-ring flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors"
        style={{ borderColor: "var(--line)", color: "var(--fg-muted)", background: "var(--surface-2)" }}
        aria-label="Change theme"
      >
        <span className="h-3 w-3 rounded-full ring-1 ring-black/10" style={{ background: active.swatch }} />
        <Palette size={13} />
        <span className="hidden sm:inline">{active.label}</span>
      </button>

      {open && (
        <div
          className="animate-pop-in absolute right-0 top-full z-50 mt-2 w-52 origin-top-right rounded-2xl border p-2 shadow-card"
          style={{ background: "var(--surface)", borderColor: "var(--line)" }}
        >
          <div className="px-2 pb-1.5 pt-1 text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--fg-muted)" }}>
            Theme
          </div>
          <div className="flex flex-col gap-0.5">
            {THEMES.map((t) => {
              const isActive = t.id === theme;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setTheme(t.id);
                    setOpen(false);
                  }}
                  className="focus-ring flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm transition-colors"
                  style={{
                    background: isActive ? "var(--surface-2)" : "transparent",
                    color: "var(--fg)",
                  }}
                >
                  <span
                    className="h-4 w-4 flex-shrink-0 rounded-full ring-1 ring-black/10"
                    style={{ background: `linear-gradient(135deg, ${t.swatch}, ${t.bg})` }}
                  />
                  <span className="flex-1">{t.label}</span>
                  {isActive && <Check size={14} style={{ color: "var(--brand)" }} />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
