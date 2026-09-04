"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, Store, ChevronDown, LogOut, LayoutDashboard, Heart } from "lucide-react";

export function UserMenu({
  merchantName,
  customerName,
}: {
  merchantName: string | null;
  customerName: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function logout(endpoint: string) {
    await fetch(endpoint, { method: "POST" });
    setOpen(false);
    router.push("/");
    router.refresh();
  }

  // Signed in as a merchant (a person can be signed in as both — merchant takes
  // display priority here since that's the more privileged context).
  if (merchantName) {
    return (
      <div ref={ref} className="relative">
        <button
          onClick={() => setOpen((o) => !o)}
          className="focus-ring flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm font-medium text-fg transition-colors hover:bg-line"
        >
          <Store size={14} /> {merchantName} <ChevronDown size={13} className="text-fg/40" />
        </button>
        {open && (
          <div className="absolute right-0 top-full mt-2 w-52 animate-fade-in rounded-xl border border-line bg-canvas p-1.5 shadow-card">
            <Link href="/merchant/dashboard" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-fg transition-colors hover:bg-surface-2">
              <LayoutDashboard size={14} /> Dashboard
            </Link>
            <button onClick={() => logout("/api/auth/logout")} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-fg/70 transition-colors hover:bg-surface-2">
              <LogOut size={14} /> Log out
            </button>
          </div>
        )}
      </div>
    );
  }

  // Signed in as a customer
  if (customerName) {
    return (
      <div ref={ref} className="relative">
        <button
          onClick={() => setOpen((o) => !o)}
          className="focus-ring flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm font-medium text-fg transition-colors hover:bg-line"
        >
          <User size={14} /> {customerName} <ChevronDown size={13} className="text-fg/40" />
        </button>
        {open && (
          <div className="absolute right-0 top-full mt-2 w-52 animate-fade-in rounded-xl border border-line bg-canvas p-1.5 shadow-card">
            <Link href="/account" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-fg transition-colors hover:bg-surface-2">
              <User size={14} /> My account
            </Link>
            <Link href="/account?section=saved" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-fg transition-colors hover:bg-surface-2">
              <Heart size={14} /> Saved items
            </Link>
            <button onClick={() => logout("/api/customer/auth/logout")} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-fg/70 transition-colors hover:bg-surface-2">
              <LogOut size={14} /> Log out
            </button>
          </div>
        )}
      </div>
    );
  }

  // Logged out
  return (
    <>
      <Link
        href="/login"
        className="focus-ring hidden items-center gap-1.5 rounded-full border border-line px-4 py-2 text-sm font-medium text-fg transition-colors hover:bg-line sm:inline-flex"
      >
        <User size={14} /> Sign in
      </Link>
      <Link
        href="/merchant/login"
        className="focus-ring shine relative overflow-hidden rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper transition-transform hover:-translate-y-0.5 hover:bg-ink/90"
      >
        Merchant login
      </Link>
    </>
  );
}
