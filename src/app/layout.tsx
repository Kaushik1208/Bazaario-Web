import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/ThemeProvider";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-display", display: "swap" });

export const metadata: Metadata = {
  title: "Bazaario — AI-ready commerce for local merchants",
  description: "Turn any small merchant's catalog into an AI-readable, AI-sellable, AI-transactable storefront.",
};

// Runs before hydration so the chosen theme applies without a flash of the
// default (light) palette.
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var t = localStorage.getItem("bazaario-theme");
    document.documentElement.setAttribute("data-theme", t || "light");
  } catch (e) {
    document.documentElement.setAttribute("data-theme", "light");
  }
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="font-sans antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
