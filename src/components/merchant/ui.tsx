"use client";

import { useState } from "react";
import { LucideIcon } from "lucide-react";

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex animate-fade-in-up items-start justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl tracking-tight text-fg">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-fg/55">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({ label, value, icon: Icon, hint }: { label: string; value: string; icon?: LucideIcon; hint?: string }) {
  return (
    <div className="card-hover group relative overflow-hidden rounded-2xl border border-line bg-surface p-5 shadow-card">
      <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-brand-500/5 transition-transform duration-500 group-hover:scale-150" />
      <div className="relative flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-fg/45">{label}</span>
        {Icon && (
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-brand-50 to-brand-100 text-brand-600 transition-transform duration-300 group-hover:scale-110">
            <Icon size={14} />
          </span>
        )}
      </div>
      <div className="relative mt-2 font-display text-2xl tracking-tight text-fg">{value}</div>
      {hint && <div className="relative mt-1 text-xs text-fg/45">{hint}</div>}
    </div>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="animate-fade-in-up rounded-2xl border border-dashed border-line bg-surface/50 px-6 py-14 text-center">
      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-400">
        <span className="h-2 w-2 rounded-full bg-brand-400 animate-pulse-ring" />
      </div>
      <div className="font-medium text-fg">{title}</div>
      <p className="mx-auto mt-1 max-w-sm text-sm text-fg/50">{body}</p>
    </div>
  );
}

export function Badge({ tone, children }: { tone: "green" | "amber" | "red" | "gray" | "blue"; children: React.ReactNode }) {
  const tones: Record<string, string> = {
    green: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500/10",
    amber: "bg-amber-50 text-amber-700 ring-1 ring-amber-500/10",
    red: "bg-red-50 text-red-600 ring-1 ring-red-500/10",
    gray: "bg-line text-fg/60 ring-1 ring-line",
    blue: "bg-brand-50 text-brand-700 ring-1 ring-brand-500/10",
  };
  const dots: Record<string, string> = {
    green: "bg-emerald-500",
    amber: "bg-amber-500",
    red: "bg-red-500",
    gray: "bg-line",
    blue: "bg-brand-500",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-transform ${tones[tone]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dots[tone]}`} />
      {children}
    </span>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`card-hover rounded-2xl border border-line bg-surface shadow-card ${className}`}>{children}</div>;
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { tone: "green" | "amber" | "red" | "gray"; label: string }> = {
    PAID: { tone: "green", label: "Paid" },
    PENDING_PAYMENT: { tone: "amber", label: "Pending" },
    PAYMENT_FAILED: { tone: "red", label: "Failed" },
    CANCELLED: { tone: "gray", label: "Cancelled" },
  };
  const m = map[status] ?? { tone: "gray" as const, label: status };
  return <Badge tone={m.tone}>{m.label}</Badge>;
}

export function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Could not read file."));
    reader.readAsDataURL(file);
  });
}

export function PhotoUpload({
  label,
  value,
  onChange,
  aspect = "square",
}: {
  label: string;
  value: string;
  onChange: (dataUrl: string) => void;
  aspect?: "square" | "wide";
}) {
  const [busy, setBusy] = useState(false);
  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const dataUrl = await readAsDataUrl(file);
      onChange(dataUrl);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      {label && <label className="mb-1.5 block text-xs font-medium text-fg/60">{label}</label>}
      <label
        className={`focus-ring relative flex cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed transition-colors hover:border-brand-400 ${
          aspect === "square" ? "h-24 w-24" : "h-28 w-full"
        }`}
        style={{ borderColor: "var(--line)", background: "var(--surface-2)" }}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt={label || "Uploaded photo"} className="h-full w-full object-cover" />
        ) : (
          <span className="px-2 text-center text-[11px] text-fg/40">{busy ? "Uploading…" : "Click to upload a real photo"}</span>
        )}
        <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </label>
      {value && (
        <button type="button" onClick={() => onChange("")} className="mt-1.5 text-[11px] text-fg/40 hover:text-red-500">
          Remove photo
        </button>
      )}
    </div>
  );
}
