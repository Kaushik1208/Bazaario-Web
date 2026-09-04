"use client";

import { createContext, useContext, useEffect, useState } from "react";

export const THEMES = [
  { id: "light", label: "Light", swatch: "#3D5DF7", bg: "#F7F7FB", scheme: "light" as const },
  { id: "dark", label: "Dark", swatch: "#6C8CFF", bg: "#0B0D12", scheme: "dark" as const },
  { id: "ocean", label: "Ocean", swatch: "#23C4D8", bg: "#0E2A3F", scheme: "dark" as const },
  { id: "sunset", label: "Sunset", swatch: "#FF6B6B", bg: "#3A1526", scheme: "dark" as const },
  { id: "forest", label: "Forest", swatch: "#4CAF7D", bg: "#16261B", scheme: "dark" as const },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];

const STORAGE_KEY = "bazaario-theme";

type ThemeContextValue = {
  theme: ThemeId;
  setTheme: (t: ThemeId) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>("light");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as ThemeId | null;
    if (stored && THEMES.some((t) => t.id === stored)) {
      setThemeState(stored);
    } else {
      document.documentElement.setAttribute("data-theme", "light");
    }
  }, []);

  function setTheme(t: ThemeId) {
    setThemeState(t);
    document.documentElement.setAttribute("data-theme", t);
    window.localStorage.setItem(STORAGE_KEY, t);
  }

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
