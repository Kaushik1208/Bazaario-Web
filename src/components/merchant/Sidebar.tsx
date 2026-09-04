"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  LineChart,
  Sparkles,
  ScrollText,
  Settings2,
  Settings,
  LogOut,
  Store,
} from "lucide-react";
import { ThemeSwitcher } from "@/components/theme/ThemeSwitcher";

const NAV = [
  { href: "/merchant/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/merchant/dashboard/products", label: "Products", icon: Package },
  { href: "/merchant/dashboard/orders", label: "Orders", icon: ShoppingBag },
  { href: "/merchant/dashboard/revenue", label: "Revenue", icon: LineChart },
  { href: "/merchant/dashboard/ai-performance", label: "AI performance", icon: Sparkles },
  { href: "/merchant/dashboard/rules", label: "Rules", icon: Settings2 },
  { href: "/merchant/dashboard/audit-logs", label: "Audit logs", icon: ScrollText },
  { href: "/merchant/dashboard/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ merchantName, merchantSlug, logoEmoji }: { merchantName: string; merchantSlug: string; logoEmoji: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/merchant/login");
    router.refresh();
  }

  return (
    <aside className="relative flex h-screen w-64 flex-shrink-0 flex-col overflow-hidden border-r border-line bg-surface/80 backdrop-blur-xl">
      <div className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-brand-400/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-10 h-56 w-56 rounded-full bg-accent-400/10 blur-3xl" />

      <div className="relative flex items-center gap-3 border-b border-line px-5 py-5">
        <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-base shadow-glow">
          <span>{logoEmoji}</span>
        </div>
        <div className="min-w-0">
          <div className="truncate font-display text-sm leading-tight text-fg">{merchantName}</div>
          <div className="text-[11px] text-fg/40">Merchant dashboard</div>
        </div>
      </div>

      <nav className="relative flex-1 space-y-1 overflow-y-auto px-3 py-4 scrollbar-thin">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`focus-ring relative flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition-colors duration-200 ${
                active ? "text-brand-700 font-medium" : "text-fg/60 hover:bg-line hover:text-fg"
              }`}
            >
              {active && (
                <motion.span
                  layoutId="sidebar-active-pill"
                  className="absolute inset-0 rounded-xl bg-gradient-to-r from-brand-50 to-brand-100/70 shadow-soft ring-1 ring-brand-500/15"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              <Icon size={16} className="relative z-10" />
              <span className="relative z-10">{label}</span>
              {active && <span className="relative z-10 ml-auto h-1.5 w-1.5 rounded-full bg-brand-500" />}
            </Link>
          );
        })}
      </nav>

      <div className="relative border-t border-line px-3 py-3">
        <ThemeSwitcher />
      </div>

      <div className="relative space-y-1 border-t border-line p-3">
        <Link
          href={`/shop/${merchantSlug}`}
          target="_blank"
          className="focus-ring flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-fg/60 transition-colors hover:bg-line hover:text-fg"
        >
          <Store size={16} /> View storefront
        </Link>
        <button
          onClick={logout}
          className="focus-ring flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-fg/60 transition-colors hover:bg-red-50 hover:text-red-600"
        >
          <LogOut size={16} /> Log out
        </button>
      </div>
    </aside>
  );
}
