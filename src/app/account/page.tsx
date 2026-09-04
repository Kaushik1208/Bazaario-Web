"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { THEMES, useTheme } from "@/components/theme/ThemeProvider";
import { ThemeSwitcher } from "@/components/theme/ThemeSwitcher";
import { Loader2, Check, User, Lock, Palette, Save, LogOut, ArrowLeft, Bell, Heart, Trash2, ShoppingBag, Package } from "lucide-react";
import { formatINR } from "@/lib/money";

type Section = "profile" | "notifications" | "saved" | "orders" | "appearance" | "security";

type CustomerFull = { name: string; email: string; phone?: string; notifyOrderUpdates?: boolean; notifyPromotions?: boolean };

export default function AccountPage() {
  return (
    <Suspense fallback={null}>
      <AccountPageInner />
    </Suspense>
  );
}

function AccountPageInner() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [customer, setCustomer] = useState<CustomerFull | null>(null);
  const searchParams = useSearchParams();
  const initialSection = (searchParams.get("section") as Section) || "profile";
  const [section, setSection] = useState<Section>(
    ["profile", "notifications", "saved", "orders", "appearance", "security"].includes(initialSection) ? initialSection : "profile"
  );

  useEffect(() => {
    fetch("/api/customer/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!d.customer) {
          router.replace("/login");
          return;
        }
        // /me only returns name+email; pull the fuller profile (phone, notification prefs) too.
        fetch("/api/customer/settings")
          .then((r) => r.json())
          .then((full) => setCustomer(full.customer ?? d.customer))
          .catch(() => setCustomer(d.customer));
      })
      .finally(() => setChecking(false));
  }, [router]);

  async function logout() {
    await fetch("/api/customer/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center" style={{ background: "var(--bg)" }}>
        <Loader2 size={20} className="animate-spin" style={{ color: "var(--fg-muted)" }} />
      </main>
    );
  }
  if (!customer) return null;

  return (
    <main className="min-h-screen" style={{ background: "var(--bg)", backgroundImage: "var(--bg-grad)" }}>
      <header
        className="flex items-center justify-between border-b px-6 py-4"
        style={{ borderColor: "var(--line)", background: "color-mix(in srgb, var(--surface) 88%, transparent)" }}
      >
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-fg/60 transition-colors hover:text-fg">
          <ArrowLeft size={14} /> Back to Bazaario
        </Link>
        <ThemeSwitcher />
      </header>

      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-8 flex items-center gap-3 animate-fade-in-up">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-2xl font-display text-lg shadow-card"
            style={{ background: "linear-gradient(135deg, var(--brand), var(--brand-2))", color: "var(--brand-fg)" }}
          >
            {customer.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="font-display text-xl tracking-tight text-fg">{customer.name}</h1>
            <p className="text-sm text-fg/50">{customer.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[180px_1fr]">
          <nav className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
            {(
              [
                { id: "profile", label: "Profile", icon: User },
                { id: "notifications", label: "Notifications", icon: Bell },
                { id: "saved", label: "Saved items", icon: Heart },
                { id: "orders", label: "My orders", icon: Package },
                { id: "appearance", label: "Appearance", icon: Palette },
                { id: "security", label: "Security", icon: Lock },
              ] as { id: Section; label: string; icon: typeof User }[]
            ).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setSection(id)}
                className={`focus-ring flex flex-shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                  section === id ? "font-medium text-brand-700" : "text-fg/60 hover:bg-line hover:text-fg"
                }`}
                style={section === id ? { background: "var(--surface-2)" } : undefined}
              >
                <Icon size={15} /> {label}
              </button>
            ))}
            <button
              onClick={logout}
              className="focus-ring mt-2 flex flex-shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm text-fg/60 transition-colors hover:bg-red-500/10 hover:text-red-500 lg:mt-4"
            >
              <LogOut size={15} /> Log out
            </button>
          </nav>

          <div className="min-w-0">
            {section === "profile" && <ProfileSection customer={customer} onSaved={setCustomer} />}
            {section === "notifications" && <NotificationsSection customer={customer} onSaved={setCustomer} />}
            {section === "saved" && <SavedItemsSection />}
            {section === "orders" && <OrdersSection />}
            {section === "appearance" && <AppearanceSection />}
            {section === "security" && <SecuritySection />}
          </div>
        </div>
      </div>
    </main>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="card-hover rounded-2xl border p-6 shadow-card" style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
      {children}
    </div>
  );
}

function SavedPill({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span className="animate-fade-in inline-flex items-center gap-1 text-xs font-medium text-emerald-500">
      <Check size={13} /> Saved
    </span>
  );
}

function ProfileSection({ customer, onSaved }: { customer: CustomerFull; onSaved: (c: CustomerFull) => void }) {
  const [name, setName] = useState(customer.name);
  const [phone, setPhone] = useState(customer.phone ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    const res = await fetch("/api/customer/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "profile", name, phone }),
    });
    setSaving(false);
    if (res.ok) {
      onSaved({ ...customer, name, phone });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
  }

  return (
    <Panel>
      <h2 className="flex items-center gap-2 font-display text-lg text-fg">
        <User size={16} /> Profile
      </h2>
      <p className="mt-1 text-sm text-fg/50">Your name, phone and email as they appear when you shop.</p>

      <form onSubmit={save} className="mt-6 max-w-sm space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-fg/60">Name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-fg/60">Phone</label>
          <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-fg/60">Email</label>
          <input className="input opacity-60" value={customer.email} disabled />
        </div>
        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={saving}
            className="focus-ring inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-glow transition-all hover:-translate-y-0.5 disabled:opacity-60"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save changes
          </button>
          <SavedPill show={saved} />
        </div>
      </form>
    </Panel>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="focus-ring relative h-6 w-11 flex-shrink-0 rounded-full transition-colors"
      style={{ background: checked ? "var(--brand)" : "var(--line)" }}
      role="switch"
      aria-checked={checked}
    >
      <span
        className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform"
        style={{ transform: checked ? "translateX(22px)" : "translateX(2px)" }}
      />
    </button>
  );
}

function NotificationsSection({ customer, onSaved }: { customer: CustomerFull; onSaved: (c: CustomerFull) => void }) {
  const [orderUpdates, setOrderUpdates] = useState(customer.notifyOrderUpdates ?? true);
  const [promotions, setPromotions] = useState(customer.notifyPromotions ?? false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save(notifyOrderUpdates: boolean, notifyPromotions: boolean) {
    setSaving(true);
    setSaved(false);
    const res = await fetch("/api/customer/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "notifications", notifyOrderUpdates, notifyPromotions }),
    });
    setSaving(false);
    if (res.ok) {
      onSaved({ ...customer, notifyOrderUpdates, notifyPromotions });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  return (
    <Panel>
      <h2 className="flex items-center gap-2 font-display text-lg text-fg">
        <Bell size={16} /> Notifications
      </h2>
      <p className="mt-1 text-sm text-fg/50">Choose what stores and Bazaario can notify you about.</p>

      <div className="mt-6 max-w-sm divide-y" style={{ borderColor: "var(--line)" }}>
        <div className="flex items-center justify-between gap-4 py-4 first:pt-0">
          <div>
            <div className="text-sm font-medium text-fg">Order updates</div>
            <div className="text-xs text-fg/50">Confirmations, payment status and delivery updates.</div>
          </div>
          <Toggle
            checked={orderUpdates}
            onChange={(v) => {
              setOrderUpdates(v);
              save(v, promotions);
            }}
          />
        </div>
        <div className="flex items-center justify-between gap-4 py-4">
          <div>
            <div className="text-sm font-medium text-fg">Deals & promotions</div>
            <div className="text-xs text-fg/50">Trending items and limited-time offers from stores you shop at.</div>
          </div>
          <Toggle
            checked={promotions}
            onChange={(v) => {
              setPromotions(v);
              save(orderUpdates, v);
            }}
          />
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">{saving && <Loader2 size={13} className="animate-spin text-fg/40" />}<SavedPill show={saved} /></div>
    </Panel>
  );
}

type SavedProduct = {
  id: string;
  productId: string;
  name: string;
  priceInPaise: number;
  imageEmoji: string;
  imageUrl: string | null;
  stockCount: number;
  merchantName: string;
  merchantSlug: string;
};

function SavedItemsSection() {
  const [items, setItems] = useState<SavedProduct[] | null>(null);

  useEffect(() => {
    fetch("/api/customer/saved-items")
      .then((r) => r.json())
      .then((d) => setItems(d.items ?? []));
  }, []);

  async function remove(productId: string) {
    setItems((cur) => (cur ? cur.filter((i) => i.productId !== productId) : cur));
    await fetch("/api/customer/saved-items", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId }),
    });
  }

  return (
    <Panel>
      <h2 className="flex items-center gap-2 font-display text-lg text-fg">
        <Heart size={16} /> Saved items
      </h2>
      <p className="mt-1 text-sm text-fg/50">Products you've saved for later while chatting with a store's AI assistant.</p>

      {items === null ? (
        <div className="mt-6 flex justify-center py-8">
          <Loader2 size={18} className="animate-spin text-fg/40" />
        </div>
      ) : items.length === 0 ? (
        <div className="mt-6 flex flex-col items-center gap-2 rounded-xl border border-dashed py-10 text-center" style={{ borderColor: "var(--line)" }}>
          <ShoppingBag size={22} className="text-fg/30" />
          <p className="text-sm text-fg/50">Nothing saved yet. Tap the heart on any product while shopping to save it here.</p>
        </div>
      ) : (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-3 rounded-xl border p-3" style={{ borderColor: "var(--line)", background: "var(--surface-2)" }}>
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.name} className="h-12 w-12 flex-shrink-0 rounded-lg object-cover" />
              ) : (
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg text-xl" style={{ background: "var(--surface)" }}>
                  {item.imageEmoji}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-fg">{item.name}</div>
                <div className="text-xs text-fg/50">{item.merchantName} · {formatINR(item.priceInPaise)}</div>
              </div>
              <button
                onClick={() => remove(item.productId)}
                aria-label="Remove from saved items"
                className="focus-ring flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-fg/40 transition-colors hover:bg-red-500/10 hover:text-red-500"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

type PastOrder = {
  id: string;
  status: string;
  totalInPaise: number;
  createdAt: string;
  merchantName: string;
  merchantSlug: string;
  items: { productName: string; quantity: number; unitPriceInPaise: number }[];
};

const ORDER_STATUS_META: Record<string, { label: string; color: string }> = {
  PAID: { label: "Delivered / Paid", color: "var(--success)" },
  PENDING_PAYMENT: { label: "Payment pending", color: "#D97706" },
  FAILED: { label: "Payment failed", color: "#EF4444" },
};

function OrdersSection() {
  const [orders, setOrders] = useState<PastOrder[] | null>(null);

  useEffect(() => {
    fetch("/api/customer/orders")
      .then((r) => r.json())
      .then((d) => setOrders(d.orders ?? []));
  }, []);

  return (
    <Panel>
      <h2 className="flex items-center gap-2 font-display text-lg text-fg">
        <Package size={16} /> My orders
      </h2>
      <p className="mt-1 text-sm text-fg/50">Everything you've bought across every store on Bazaario, in one place.</p>

      {orders === null ? (
        <div className="mt-6 flex justify-center py-8">
          <Loader2 size={18} className="animate-spin text-fg/40" />
        </div>
      ) : orders.length === 0 ? (
        <div className="mt-6 flex flex-col items-center gap-2 rounded-xl border border-dashed py-10 text-center" style={{ borderColor: "var(--line)" }}>
          <Package size={22} className="text-fg/30" />
          <p className="text-sm text-fg/50">No orders yet — orders you place while signed in will show up here.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {orders.map((o) => {
            const meta = ORDER_STATUS_META[o.status] ?? { label: o.status, color: "var(--fg-muted)" };
            return (
              <div key={o.id} className="rounded-xl border p-4" style={{ borderColor: "var(--line)", background: "var(--surface-2)" }}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-medium text-fg">{o.merchantName}</div>
                    <div className="text-xs text-fg/45">{new Date(o.createdAt).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" })}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-display text-sm text-fg">{formatINR(o.totalInPaise)}</div>
                    <div className="text-[11px] font-medium" style={{ color: meta.color }}>{meta.label}</div>
                  </div>
                </div>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {o.items.map((it, idx) => (
                    <span key={idx} className="rounded-full px-2 py-0.5 text-[11px]" style={{ background: "var(--surface)", color: "var(--fg-muted)" }}>
                      {it.quantity}× {it.productName}
                    </span>
                  ))}
                </div>
                <Link href={`/shop/${o.merchantSlug}`} className="mt-2.5 inline-block text-xs font-medium text-brand-600 hover:underline">
                  Shop {o.merchantName} again →
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

function AppearanceSection() {
  const { theme, setTheme } = useTheme();
  return (
    <Panel>
      <h2 className="flex items-center gap-2 font-display text-lg text-fg">
        <Palette size={16} /> Appearance
      </h2>
      <p className="mt-1 text-sm text-fg/50">Pick a theme for your shopping experience. Saved to this browser.</p>

      <div className="stagger mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {THEMES.map((t) => {
          const active = t.id === theme;
          return (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={`focus-ring card-hover relative flex flex-col items-start gap-3 rounded-2xl border p-4 text-left transition-colors ${
                active ? "border-brand-500/40" : "border-line"
              }`}
              style={{ background: active ? "var(--surface-2)" : "var(--surface)" }}
            >
              <div
                className="h-9 w-full rounded-lg ring-1 ring-black/10"
                style={{ background: `linear-gradient(135deg, ${t.swatch}, ${t.bg})` }}
              />
              <div className="flex w-full items-center justify-between">
                <span className="text-sm font-medium text-fg">{t.label}</span>
                {active && (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-brand-500 text-white">
                    <Check size={10} />
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </Panel>
  );
}

function SecuritySection() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (next.length < 8) return setError("New password must be at least 8 characters.");
    if (next !== confirm) return setError("New passwords don't match.");
    setSaving(true);
    const res = await fetch("/api/customer/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "password", currentPassword: current, newPassword: next }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) return setError(data.error || "Something went wrong.");
    setSaved(true);
    setCurrent("");
    setNext("");
    setConfirm("");
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <Panel>
      <h2 className="flex items-center gap-2 font-display text-lg text-fg">
        <Lock size={16} /> Security
      </h2>
      <p className="mt-1 text-sm text-fg/50">Change your password.</p>

      <form onSubmit={save} className="mt-6 max-w-sm space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-fg/60">Current password</label>
          <input type="password" className="input" value={current} onChange={(e) => setCurrent(e.target.value)} required />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-fg/60">New password</label>
          <input type="password" className="input" value={next} onChange={(e) => setNext(e.target.value)} required />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-fg/60">Confirm new password</label>
          <input type="password" className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={saving}
            className="focus-ring inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-glow transition-all hover:-translate-y-0.5 disabled:opacity-60"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Update password
          </button>
          <SavedPill show={saved} />
        </div>
      </form>
    </Panel>
  );
}
