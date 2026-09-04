"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, User } from "lucide-react";
import { ThemeSwitcher } from "@/components/theme/ThemeSwitcher";
import { StepWizard, type WizardStep } from "@/components/onboarding/StepWizard";

export default function CustomerSignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/customer/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
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

  const steps: WizardStep[] = [
    {
      id: "name",
      title: "What should we call you?",
      subtitle: "Let's get your account set up.",
      canContinue: () => name.trim().length > 0,
      render: ({ autoFocus }) => (
        <input
          autoFocus={autoFocus}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input text-base"
          placeholder="Your name"
        />
      ),
    },
    {
      id: "phone",
      title: "Add a phone number",
      subtitle: "For order updates. You can skip this and add it later.",
      canContinue: () => true,
      render: ({ autoFocus }) => (
        <input
          autoFocus={autoFocus}
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="input text-base"
          placeholder="+91 98765 43210 (optional)"
        />
      ),
    },
    {
      id: "email",
      title: "What's your email?",
      subtitle: "We'll use this to sign you in.",
      canContinue: () => /\S+@\S+\.\S+/.test(email),
      render: ({ autoFocus }) => (
        <input
          autoFocus={autoFocus}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input text-base"
          placeholder="you@example.com"
        />
      ),
    },
    {
      id: "password",
      title: "Create a password",
      subtitle: "At least 8 characters.",
      canContinue: () => password.length >= 8,
      render: ({ autoFocus }) => (
        <input
          autoFocus={autoFocus}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input text-base"
          placeholder="At least 8 characters"
        />
      ),
    },
  ];

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

        <StepWizard steps={steps} onComplete={handleSubmit} submitting={loading} submitLabel="Create account" error={error} />

        <p className="mt-6 text-center text-sm text-fg/55">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-brand-600 hover:underline">
            Log in
          </Link>
        </p>
        <p className="mt-2 text-center text-xs text-fg/40">
          Run a store instead?{" "}
          <Link href="/merchant/signup" className="font-medium hover:underline" style={{ color: "var(--fg-muted)" }}>
            Merchant signup
          </Link>
        </p>
      </div>
    </main>
  );
}
