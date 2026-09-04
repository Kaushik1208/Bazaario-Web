"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, ArrowLeft, User } from "lucide-react";
import { ThemeSwitcher } from "@/components/theme/ThemeSwitcher";

export default function CustomerLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/customer/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed.");
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      className="mesh-bg flex min-h-screen items-center justify-center px-6 py-16"
      style={{ background: "var(--bg)", backgroundImage: "var(--bg-grad)" }}
    >
      <div className="w-full max-w-sm animate-fade-in-up">
        <div className="mb-8 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-fg/50 transition-colors hover:text-fg">
            <ArrowLeft size={14} /> Back to Bazaario
          </Link>
          <ThemeSwitcher />
        </div>

        <div
          className="mx-auto mb-5 flex h-11 w-11 items-center justify-center rounded-2xl shadow-card"
          style={{ background: "linear-gradient(135deg, var(--brand), var(--brand-2))", color: "var(--brand-fg)" }}
        >
          <User size={20} />
        </div>
        <h1 className="text-center font-display text-2xl tracking-tight text-fg">Sign in</h1>
        <p className="mt-1 text-center text-sm text-fg/55">Save your details and pick up any storefront chat where you left off.</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-fg/60">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-fg/60">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              placeholder="••••••••"
            />
          </div>
          {error && <p className="animate-fade-in text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="focus-ring shine relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 py-2.5 text-sm font-semibold text-white shadow-glow transition-all hover:shadow-glow-lg disabled:opacity-60"
          >
            {loading && <Loader2 size={15} className="animate-spin" />}
            Log in
          </button>
        </form>

        <details className="mt-6 rounded-xl border border-dashed border-line bg-surface/60 p-4 text-xs text-fg/55">
          <summary className="cursor-pointer font-medium text-fg/70">Just want to try it out?</summary>
          <p className="mt-2">Use the seeded demo shopper's login:</p>
          <button
            type="button"
            onClick={() => {
              setEmail("shopper@bazaario.demo");
              setPassword("demo1234");
            }}
            className="focus-ring mt-2 rounded-lg border border-line px-2.5 py-1.5 font-mono text-fg/70 transition-colors hover:bg-line"
          >
            shopper@bazaario.demo · demo1234
          </button>
        </details>

        <p className="mt-6 text-center text-sm text-fg/55">
          New here?{" "}
          <Link href="/signup" className="font-medium text-brand-600 hover:underline">
            Create an account
          </Link>
        </p>
        <p className="mt-2 text-center text-xs text-fg/40">
          Run a store instead?{" "}
          <Link href="/merchant/login" className="font-medium hover:underline" style={{ color: "var(--fg-muted)" }}>
            Merchant login
          </Link>
        </p>
      </div>
    </main>
  );
}
