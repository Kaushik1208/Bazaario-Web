"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, ArrowLeft, ShieldCheck, Sparkles, Workflow } from "lucide-react";
import { ThemeSwitcher } from "@/components/theme/ThemeSwitcher";

export default function MerchantLoginPage() {
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
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed.");
        return;
      }
      router.push("/merchant/dashboard");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen grid-cols-1 lg:grid-cols-[1.1fr_1fr]">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-ink px-12 py-10 lg:flex lg:flex-col lg:justify-between">
        <div
          className="absolute inset-0 opacity-90"
          style={{
            backgroundImage:
              "radial-gradient(900px 500px at 15% -10%, rgba(61,93,247,0.35) 0%, transparent 60%), radial-gradient(700px 500px at 100% 100%, rgba(245,165,36,0.22) 0%, transparent 55%)",
          }}
        />
        <div className="glow-orb h-72 w-72 animate-float bg-brand-500/30" style={{ top: "10%", right: "-6rem" }} />
        <div className="glow-orb h-64 w-64 animate-float-slow bg-accent-500/25" style={{ bottom: "-4rem", left: "-3rem" }} />
        <div className="grid-overlay absolute inset-0" />

        <Link href="/" className="relative z-10 flex items-center gap-2 text-paper">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 font-display text-sm shadow-glow">B</div>
          <span className="font-display text-lg tracking-tight">Bazaario</span>
        </Link>

        <div className="relative z-10 max-w-md animate-fade-in-up">
          <h2 className="font-display text-4xl leading-tight tracking-tight text-paper">
            Run your AI-powered storefront from one dashboard.
          </h2>
          <p className="mt-4 text-sm text-paper/60">
            Track revenue, tune your AI assistant's rules, and watch every recommendation trace back to
            a fully auditable decision.
          </p>
          <ul className="mt-8 space-y-4 stagger">
            <li className="flex items-start gap-3 text-sm text-paper/75">
              <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-white/10">
                <Workflow size={14} />
              </span>
              Live orders &amp; revenue, updated in real time.
            </li>
            <li className="flex items-start gap-3 text-sm text-paper/75">
              <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-white/10">
                <Sparkles size={14} />
              </span>
              See exactly how your AI assistant upsells &amp; cross-sells.
            </li>
            <li className="flex items-start gap-3 text-sm text-paper/75">
              <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-white/10">
                <ShieldCheck size={14} />
              </span>
              Every AI decision logged to a full audit trail.
            </li>
          </ul>
        </div>

        <p className="relative z-10 text-xs text-paper/35">Razorpay AI Growth &amp; Agentic Commerce Buildathon</p>
      </div>

      {/* Form panel */}
      <div className="mesh-bg flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm animate-fade-in-up">
          <div className="mb-8 flex items-center justify-between">
            <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-fg/50 transition-colors hover:text-fg lg:hidden">
              <ArrowLeft size={14} /> Back to Bazaario
            </Link>
            <div className="ml-auto"><ThemeSwitcher /></div>
          </div>
          <h1 className="font-display text-2xl tracking-tight text-fg">Welcome back</h1>
          <p className="mt-1 text-sm text-fg/55">Manage your catalog, pricing, rules and AI performance.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-fg/60">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="you@yourshop.com"
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
            {error && <p className="animate-fade-in text-sm text-red-600">{error}</p>}
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
            <p className="mt-2">Use the seeded demo store's login:</p>
            <button
              type="button"
              onClick={() => {
                setEmail("owner@gearhub.demo");
                setPassword("demo1234");
              }}
              className="focus-ring mt-2 rounded-lg border border-line px-2.5 py-1.5 font-mono text-fg/70 transition-colors hover:bg-line"
            >
              owner@gearhub.demo · demo1234
            </button>
          </details>

          <p className="mt-6 text-center text-sm text-fg/55">
            New to Bazaario?{" "}
            <Link href="/merchant/signup" className="font-medium text-brand-600 hover:underline">
              Create a merchant account
            </Link>
          </p>
          <p className="mt-2 text-center text-xs text-fg/40">
            Shopping instead?{" "}
            <Link href="/login" className="font-medium hover:underline" style={{ color: "var(--fg-muted)" }}>
              Sign in as a customer
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
